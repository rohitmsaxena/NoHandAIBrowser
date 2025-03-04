// src/services/ai/modelManager.ts
import fs from "fs";
import path from "path";
import { app } from "electron";
import { getLlama, LlamaChatSession } from "node-llama-cpp";

// Types for model configuration
export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  path: string;
  parameters: number; // in billions
  contextSize: number;
  isLoaded: boolean;
  type: "chat" | "vision" | "embedding";
  quantization: "4-bit" | "5-bit" | "8-bit" | "none";
  size: number; // file size in MB
}

export class ModelManager {
  private modelsDir: string;
  private llama: any = null; // Will hold the llama instance
  private loadedModels: Map<string, { model: any; context: any }> = new Map();
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private activeModelId: string | null = null;
  private initialized = false;

  constructor() {
    // Store models in userData directory
    this.modelsDir = path.join(app.getPath("userData"), "models");

    // Create models directory if it doesn't exist
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }

    // Load model configs on startup
    this.loadModelConfigs();
  }

  // Initialize the llama instance
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      this.llama = await getLlama();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Error initializing llama:", error);
      return false;
    }
  }

  // Load model configurations from disk
  private loadModelConfigs(): void {
    const configPath = path.join(this.modelsDir, "model-configs.json");

    try {
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));

        for (const [id, config] of Object.entries(configData)) {
          this.modelConfigs.set(id, {
            ...(config as ModelConfig),
            isLoaded: false, // Reset loaded status on app start
          });
        }

        console.log(`Loaded ${this.modelConfigs.size} model configurations`);
      }
    } catch (error) {
      console.error("Error loading model configurations:", error);
    }
  }

  // Save model configurations to disk
  private saveModelConfigs(): void {
    const configPath = path.join(this.modelsDir, "model-configs.json");

    try {
      const configData: Record<string, ModelConfig> = {};

      for (const [id, config] of this.modelConfigs.entries()) {
        configData[id] = config;
      }

      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
    } catch (error) {
      console.error("Error saving model configurations:", error);
    }
  }

  // Get the list of available models
  getAvailableModels(): ModelConfig[] {
    return Array.from(this.modelConfigs.values());
  }

  // Register a new model
  registerModel(config: Omit<ModelConfig, "isLoaded">): ModelConfig {
    const newConfig: ModelConfig = {
      ...config,
      isLoaded: false,
    };

    this.modelConfigs.set(config.id, newConfig);
    this.saveModelConfigs();

    return newConfig;
  }

  // Load a model into memory
  async loadModel(modelId: string): Promise<boolean> {
    try {
      // Make sure llama is initialized
      if (!this.initialized) {
        const success = await this.initialize();
        if (!success) {
          throw new Error("Failed to initialize llama");
        }
      }

      // Check if model exists in registry
      const modelConfig = this.modelConfigs.get(modelId);
      if (!modelConfig) {
        throw new Error(`Model with ID ${modelId} not found in registry`);
      }

      // Check if model file exists
      const modelPath = modelConfig.path;
      if (!fs.existsSync(modelPath)) {
        throw new Error(`Model file not found at ${modelPath}`);
      }

      // Unload other models if memory constraints require it
      // This is a simple implementation - could be more sophisticated based on RAM usage
      if (modelConfig.parameters > 7) {
        // If model is larger than 7B parameters
        await this.unloadAllModels();
      }

      // Load the model
      console.log(`Loading model: ${modelConfig.name}`);

      try {
        // Load the model using the llama instance
        const model = await this.llama.loadModel({
          modelPath: modelPath,
          contextSize: modelConfig.contextSize,
        });

        // Create a context
        const context = await model.createContext();

        // Store the loaded model and context
        this.loadedModels.set(modelId, { model, context });

        // Update config
        modelConfig.isLoaded = true;
        this.modelConfigs.set(modelId, modelConfig);

        // Set as active model
        this.activeModelId = modelId;

        console.log(`Successfully loaded model: ${modelConfig.name}`);
        return true;
      } catch (error) {
        console.error(`Error initializing model ${modelId}:`, error);
        return false;
      }
    } catch (error) {
      console.error(`Error loading model ${modelId}:`, error);
      return false;
    }
  }

  // Unload a specific model
  async unloadModel(modelId: string): Promise<boolean> {
    try {
      const modelData = this.loadedModels.get(modelId);
      if (!modelData) {
        return false; // Model not loaded
      }

      // Update model config
      const modelConfig = this.modelConfigs.get(modelId);
      if (modelConfig) {
        modelConfig.isLoaded = false;
        this.modelConfigs.set(modelId, modelConfig);
      }

      // Remove from loaded models
      this.loadedModels.delete(modelId);

      // Reset active model if this was active
      if (this.activeModelId === modelId) {
        this.activeModelId = null;
      }

      console.log(`Unloaded model: ${modelConfig?.name || modelId}`);
      return true;
    } catch (error) {
      console.error(`Error unloading model ${modelId}:`, error);
      return false;
    }
  }

  // Unload all models
  async unloadAllModels(): Promise<void> {
    const modelIds = Array.from(this.loadedModels.keys());

    for (const modelId of modelIds) {
      await this.unloadModel(modelId);
    }

    this.activeModelId = null;
  }

  // Get a chat session for the currently active model
  async getChatSession(): Promise<LlamaChatSession | null> {
    if (!this.activeModelId) {
      return null;
    }

    const modelData = this.loadedModels.get(this.activeModelId);
    if (!modelData) {
      return null;
    }

    // Create a chat session with the model's context sequence
    return new LlamaChatSession({
      contextSequence: modelData.context.getSequence(),
    });
  }

  // Get a chat session for a specific model
  async getChatSessionForModel(
    modelId: string,
  ): Promise<LlamaChatSession | null> {
    const modelData = this.loadedModels.get(modelId);
    if (!modelData) {
      return null;
    }

    // Create a chat session with the model's context sequence
    return new LlamaChatSession({
      contextSequence: modelData.context.getSequence(),
    });
  }

  // Check if a model is loaded
  isModelLoaded(modelId: string): boolean {
    return this.loadedModels.has(modelId);
  }

  // Get the currently active model ID
  getActiveModelId(): string | null {
    return this.activeModelId;
  }

  // Set the active model
  setActiveModel(modelId: string): boolean {
    if (!this.loadedModels.has(modelId)) {
      return false;
    }

    this.activeModelId = modelId;
    return true;
  }

  // Get the models directory
  getModelsDirectory(): string {
    return this.modelsDir;
  }
}

// Export a singleton instance
export const modelManager = new ModelManager();
