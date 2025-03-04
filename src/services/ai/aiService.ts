// src/services/ai/aiService.ts
import { LlamaChatSession } from "node-llama-cpp";
import { modelManager } from "./modelManager";
import { EventEmitter } from "events";

// Response types
export interface AICompletionResponse {
  text: string;
  tokenCount: number;
  completed: boolean;
}

// Task types
export type AITask =
  | { type: "completion"; prompt: string; modelId?: string }
  | {
      type: "chat";
      messages: { role: "system" | "user" | "assistant"; content: string }[];
      modelId?: string;
    }
  | { type: "analyze_page"; screenshot: Buffer; modelId?: string };

// Task result
export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class AIService extends EventEmitter {
  private defaultChatModel: string | null = null;
  private defaultVisionModel: string | null = null;

  constructor() {
    super();
  }

  // Set default models
  setDefaultModels(chatModelId: string, visionModelId: string): void {
    this.defaultChatModel = chatModelId;
    this.defaultVisionModel = visionModelId;
  }

  // Get a chat session, optionally for a specific model
  private async getChatSession(
    modelId?: string,
  ): Promise<LlamaChatSession | null> {
    const targetModelId = modelId || this.defaultChatModel;

    if (!targetModelId) {
      throw new Error("No model specified and no default chat model set");
    }

    // If model is not loaded, load it first
    if (!modelManager.isModelLoaded(targetModelId)) {
      const success = await modelManager.loadModel(targetModelId);
      if (!success) {
        throw new Error(`Failed to load model: ${targetModelId}`);
      }
    }

    return modelManager.getChatSessionForModel(targetModelId);
  }

  // Execute a chat completion with streaming
  async chatCompletion(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    modelId?: string,
    onProgress?: (chunk: string) => void,
  ): Promise<AICompletionResponse> {
    try {
      const chatSession = await this.getChatSession(modelId);

      if (!chatSession) {
        throw new Error("Failed to get chat session");
      }

      let fullResponse = "";
      let tokenCount = 0;

      // Process the messages
      // For the system message, we'll need to handle it as part of the first prompt
      let systemPrompt = "";

      // Find the system message if any
      const systemMessage = messages.find((msg) => msg.role === "system");
      if (systemMessage) {
        systemPrompt = systemMessage.content;
      }

      // Process user/assistant exchanges
      let lastUserMessage = "";

      // Get all messages except system messages
      const chatMessages = messages.filter((msg) => msg.role !== "system");

      // Handle all but the last message as chat history
      for (let i = 0; i < chatMessages.length - 1; i++) {
        const msg = chatMessages[i];

        if (
          msg.role === "user" &&
          i + 1 < chatMessages.length &&
          chatMessages[i + 1].role === "assistant"
        ) {
          // Found a user and assistant pair, handle as a Q/A history item
          const response = await chatSession.prompt(msg.content);
          // We don't need the response, just setting up the chat history
        }
      }

      // Get the last message for the final prompt
      if (chatMessages.length > 0) {
        const lastMessage = chatMessages[chatMessages.length - 1];
        if (lastMessage.role === "user") {
          lastUserMessage = lastMessage.content;
        }
      }

      if (!lastUserMessage) {
        throw new Error("No user message found to respond to");
      }

      // Now generate the response to the final message
      fullResponse = await chatSession.prompt(lastUserMessage);
      tokenCount = fullResponse.length / 4; // Rough approximation

      return {
        text: fullResponse,
        tokenCount: tokenCount,
        completed: true,
      };
    } catch (error) {
      console.error("Error in chat completion:", error);
      throw error;
    }
  }

  // Execute a task
  async executeTask(task: AITask): Promise<TaskResult> {
    try {
      let result;

      switch (task.type) {
        case "completion": {
          result = await this.chatCompletion(
            [{ role: "user", content: task.prompt }],
            task.modelId,
          );
          return {
            success: true,
            data: result,
          };
        }

        case "chat": {
          result = await this.chatCompletion(task.messages, task.modelId);
          return {
            success: true,
            data: result,
          };
        }

        case "analyze_page":
          // For now, we'll return a placeholder
          // This will be implemented properly when we add vision capabilities
          return {
            success: false,
            error: "Page analysis not yet implemented",
          };

        default:
          return {
            success: false,
            error: "Unknown task type",
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Unknown error in task execution",
      };
    }
  }

  // Break down a complex request into smaller tasks
  async orchestrateRequest(request: string): Promise<TaskResult[]> {
    // For now, we'll just convert the request to a single task
    // In the future, this will use a planning model to break it down
    const results: TaskResult[] = [];

    // Simple task execution
    const result = await this.executeTask({
      type: "chat",
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant embedded in a browser. Break down the user request into smaller tasks that you can execute.",
        },
        { role: "user", content: request },
      ],
    });

    results.push(result);
    return results;
  }
}

// Export a singleton instance
export const aiService = new AIService();
