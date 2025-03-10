import { EventEmitter } from "events";
import {
  getLlama,
  Llama,
  LlamaChatSession,
  LlamaContext,
  LlamaContextSequence,
  LlamaModel,
} from "node-llama-cpp";

// LLM State interface
export interface LlmState {
  llama: {
    loaded: boolean;
    error?: string;
  };
  selectedModelFilePath?: string;
  model: {
    loaded: boolean;
    loading: boolean;
    loadProgress?: number;
    name?: string;
    error?: string;
  };
  context: {
    loaded: boolean;
    error?: string;
  };
  contextSequence: {
    loaded: boolean;
    error?: string;
  };
  chatSession: {
    loaded: boolean;
    generating: boolean;
    error?: string;
  };
}

/**
 * Manager for interfacing with node-llama-cpp
 * Handles loading models, creating chat sessions, and generating responses
 */
export class LlmManager {
  private llama: Llama | null = null;
  private model: LlamaModel | null = null;
  private context: LlamaContext | null = null;
  private contextSequence: LlamaContextSequence | null = null;
  private chatSession: LlamaChatSession | null = null;
  private abortController: AbortController | null = null;

  private eventEmitter = new EventEmitter();
  private state: LlmState = {
    llama: { loaded: false },
    model: { loaded: false, loading: false },
    context: { loaded: false },
    contextSequence: { loaded: false },
    chatSession: { loaded: false, generating: false },
  };

  constructor() {
    // Set higher limit for event listeners to prevent warnings
    this.eventEmitter.setMaxListeners(50);
  }

  /**
   * Load the Llama library
   */
  async loadLlama(): Promise<boolean> {
    try {
      // Update state
      this.updateState({
        llama: { loaded: false },
      });

      // Clean up existing instance if any
      if (this.llama) {
        try {
          await this.llama.dispose();
        } catch (err) {
          console.error("Error disposing existing Llama instance:", err);
        }
        this.llama = null;
      }

      // Load the library
      this.llama = await getLlama();

      // Update state
      this.updateState({
        llama: { loaded: true },
      });

      return true;
    } catch (error) {
      console.error("Failed to load Llama:", error);
      this.updateState({
        llama: { loaded: false, error: String(error) },
      });
      return false;
    }
  }

  /**
   * Load a model from the specified path
   */
  async loadModel(modelPath: string): Promise<boolean> {
    try {
      // Make sure Llama is loaded
      if (!this.llama) {
        const llamaLoaded = await this.loadLlama();
        if (!llamaLoaded) {
          return false;
        }
      }

      // Update state
      this.updateState({
        selectedModelFilePath: modelPath,
        model: { loaded: false, loading: true, loadProgress: 0 },
      });

      // Clean up existing model if any
      if (this.model) {
        try {
          await this.model.dispose();
        } catch (err) {
          console.error("Error disposing existing model:", err);
        }
        this.model = null;
      }

      // Load the model
      this.model = await this.llama!.loadModel({
        modelPath,
        onLoadProgress: (progress) => {
          this.updateState({
            model: { ...this.state.model, loadProgress: progress },
          });
        },
      });

      // Extract model name from path
      const modelName = modelPath.split(/[\\/]/).pop();

      // Update state
      this.updateState({
        model: {
          loaded: true,
          loading: false,
          loadProgress: 1,
          name: modelName,
        },
      });

      // Create context, sequence, and chat session
      await this.createContext();
      await this.createContextSequence();
      await this.createChatSession();

      return true;
    } catch (error) {
      console.error("Failed to load model:", error);
      this.updateState({
        model: {
          loaded: false,
          loading: false,
          error: String(error),
        },
      });
      return false;
    }
  }

  /**
   * Create a LlamaContext for the loaded model
   */
  private async createContext(): Promise<boolean> {
    try {
      if (!this.model) {
        console.error("Cannot create context: Model not loaded");
        return false;
      }

      // Update state
      this.updateState({
        context: { loaded: false },
      });

      // Clean up existing context if any
      if (this.context) {
        try {
          await this.context.dispose();
        } catch (err) {
          console.error("Error disposing existing context:", err);
        }
        this.context = null;
      }

      // Create the context
      this.context = await this.model.createContext();

      // Update state
      this.updateState({
        context: { loaded: true },
      });

      return true;
    } catch (error) {
      console.error("Failed to create context:", error);
      this.updateState({
        context: { loaded: false, error: String(error) },
      });
      return false;
    }
  }

  /**
   * Create a LlamaContextSequence for the loaded context
   */
  private async createContextSequence(): Promise<boolean> {
    try {
      if (!this.context) {
        console.error("Cannot create context sequence: Context not loaded");
        return false;
      }

      // Update state
      this.updateState({
        contextSequence: { loaded: false },
      });

      // Clean up existing context sequence if any
      if (this.contextSequence) {
        try {
          this.contextSequence.dispose();
        } catch (err) {
          console.error("Error disposing existing context sequence:", err);
        }
        this.contextSequence = null;
      }

      // Create the context sequence
      this.contextSequence = this.context.getSequence();

      // Update state
      this.updateState({
        contextSequence: { loaded: true },
      });

      return true;
    } catch (error) {
      console.error("Failed to create context sequence:", error);
      this.updateState({
        contextSequence: { loaded: false, error: String(error) },
      });
      return false;
    }
  }

  /**
   * Create a LlamaChatSession for the loaded context sequence
   */
  private async createChatSession(): Promise<boolean> {
    try {
      if (!this.contextSequence) {
        console.error(
          "Cannot create chat session: Context sequence not loaded",
        );
        return false;
      }

      // Update state
      this.updateState({
        chatSession: { loaded: false, generating: false },
      });

      // Clean up existing chat session if any
      if (this.chatSession) {
        try {
          this.chatSession.dispose();
        } catch (err) {
          console.error("Error disposing existing chat session:", err);
        }
        this.chatSession = null;
      }

      // Create the chat session
      this.chatSession = new LlamaChatSession({
        contextSequence: this.contextSequence,
        autoDisposeSequence: false,
      });

      // Update state
      this.updateState({
        chatSession: { loaded: true, generating: false },
      });

      return true;
    } catch (error) {
      console.error("Failed to create chat session:", error);
      this.updateState({
        chatSession: { loaded: false, generating: false, error: String(error) },
      });
      return false;
    }
  }

  /**
   * Send a prompt to the LLM and get a response
   * Supports streaming response chunks
   */
  async sendPrompt(
    prompt: string,
    onResponseChunk?: (chunk: string) => void,
  ): Promise<string> {
    try {
      if (!this.chatSession) {
        const errorMsg = "Chat session not loaded. Please load a model first.";
        console.error(errorMsg);
        return errorMsg;
      }

      // Create a new abort controller for this prompt
      this.abortController = new AbortController();

      // Update state
      this.updateState({
        chatSession: { ...this.state.chatSession, generating: true },
      });

      // Send the prompt and collect response
      let fullResponse = "";
      const response = await this.chatSession.prompt(prompt, {
        signal: this.abortController.signal,
        onResponseChunk: (chunk) => {
          // Accumulate the full response
          fullResponse += chunk.text;

          // Call the callback with the new chunk
          if (onResponseChunk) {
            onResponseChunk(chunk.text);
          }
        },
      });

      // Update state
      this.updateState({
        chatSession: { ...this.state.chatSession, generating: false },
      });

      return response;
    } catch (error) {
      // Check if this was an abort error
      if (this.abortController?.signal.aborted) {
        console.log("Prompt generation was aborted");
        this.updateState({
          chatSession: { ...this.state.chatSession, generating: false },
        });
        return "[Generation stopped]";
      }

      // Otherwise it's a real error
      console.error("Error generating response:", error);
      this.updateState({
        chatSession: {
          ...this.state.chatSession,
          generating: false,
          error: String(error),
        },
      });
      return `Error generating response: ${error}`;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Stop the current generation
   */
  stopGeneration(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;

      this.updateState({
        chatSession: { ...this.state.chatSession, generating: false },
      });
    }
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    // Stop any ongoing generation
    this.stopGeneration();

    // Dispose in reverse order of creation
    if (this.chatSession) {
      try {
        this.chatSession.dispose();
      } catch (err) {
        console.error("Error disposing chat session:", err);
      }
      this.chatSession = null;
    }

    if (this.contextSequence) {
      try {
        this.contextSequence.dispose();
      } catch (err) {
        console.error("Error disposing context sequence:", err);
      }
      this.contextSequence = null;
    }

    if (this.context) {
      try {
        await this.context.dispose();
      } catch (err) {
        console.error("Error disposing context:", err);
      }
      this.context = null;
    }

    if (this.model) {
      try {
        await this.model.dispose();
      } catch (err) {
        console.error("Error disposing model:", err);
      }
      this.model = null;
    }

    if (this.llama) {
      try {
        await this.llama.dispose();
      } catch (err) {
        console.error("Error disposing Llama:", err);
      }
      this.llama = null;
    }

    // Reset state
    this.updateState({
      llama: { loaded: false },
      selectedModelFilePath: undefined,
      model: { loaded: false, loading: false },
      context: { loaded: false },
      contextSequence: { loaded: false },
      chatSession: { loaded: false, generating: false },
    });
  }

  /**
   * Get the current state
   */
  getState(): LlmState {
    return { ...this.state };
  }

  /**
   * Register a listener for state changes
   */
  onStateChanged(callback: (state: LlmState) => void): void {
    this.eventEmitter.on("stateChanged", callback);
  }

  /**
   * Remove a state change listener
   */
  offStateChanged(callback: (state: LlmState) => void): void {
    this.eventEmitter.off("stateChanged", callback);
  }

  /**
   * Check if a model is currently loaded and ready
   */
  isModelReady(): boolean {
    return (
      this.state.llama.loaded &&
      this.state.model.loaded &&
      this.state.context.loaded &&
      this.state.contextSequence.loaded &&
      this.state.chatSession.loaded
    );
  }

  /**
   * Update the state and emit change event
   */
  private updateState(partialState: Partial<LlmState>): void {
    // Update the state
    this.state = {
      ...this.state,
      ...partialState,
      // Handle nested objects
      llama: { ...this.state.llama, ...(partialState.llama || {}) },
      model: { ...this.state.model, ...(partialState.model || {}) },
      context: { ...this.state.context, ...(partialState.context || {}) },
      contextSequence: {
        ...this.state.contextSequence,
        ...(partialState.contextSequence || {}),
      },
      chatSession: {
        ...this.state.chatSession,
        ...(partialState.chatSession || {}),
      },
    };

    // Emit the stateChanged event
    this.eventEmitter.emit("stateChanged", this.state);
  }
}

// Export singleton instance
export const llmManager = new LlmManager();
