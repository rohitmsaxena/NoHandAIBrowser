import { dialog } from "electron";
import { windowManager } from "./windowManager";
import { tabManager } from "./tabManager";
import { llmManager } from "./llmManager";

// Interface for chat message
interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "ai" | "system";
  timestamp: number;
  streaming?: boolean;
}

// Sidebar manager class
export class SidebarManager {
  private messages: ChatMessage[] = [];

  // Toggle sidebar expanded/collapsed state
  toggleSidebar(): boolean {
    const newState = windowManager.toggleSidebar();

    // Update tab layouts to account for sidebar width change
    tabManager.updateTabLayoutsForSidebar();

    return newState;
  }

  // Get current sidebar state
  getSidebarState(): boolean {
    return windowManager.getSidebarState();
  }

  // Select and load a model file
  async selectModelFile(): Promise<boolean> {
    try {
      // Show file selection dialog
      const result = await dialog.showOpenDialog({
        title: "Select LLM Model File",
        filters: [{ name: "GGUF Model Files", extensions: ["gguf"] }],
        properties: ["openFile"],
      });

      // User canceled or no file selected
      if (result.canceled || result.filePaths.length === 0) {
        return false;
      }

      // Get the selected file path
      const modelPath = result.filePaths[0];

      // Create a system message to indicate model loading
      const loadingMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: `Loading model: ${modelPath.split(/[\\/]/).pop()}...`,
        sender: "system",
        timestamp: Date.now(),
      };

      // Add to messages array and notify UI
      this.messages.push(loadingMessage);
      this.notifySidebarOfMessage(loadingMessage);

      // Load the model
      const success = await llmManager.loadModel(modelPath);

      if (success) {
        // Update the loading message with success
        loadingMessage.content = `Model loaded successfully: ${llmManager.getState().model.name}`;
        this.notifySidebarOfMessage(loadingMessage);

        return true;
      } else {
        // Update the loading message with error
        const error = llmManager.getState().model.error || "Unknown error";
        loadingMessage.content = `Failed to load model: ${error}`;
        this.notifySidebarOfMessage(loadingMessage);

        return false;
      }
    } catch (error) {
      console.error("Error in selectModelFile:", error);
      return false;
    }
  }

  // Handle a new message from the user
  async sendChatMessage(messageContent: string): Promise<ChatMessage> {
    // Create a user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: messageContent,
      sender: "user",
      timestamp: Date.now(),
    };

    // Add to messages array
    this.messages.push(userMessage);

    // Notify sidebar view of new message
    this.notifySidebarOfMessage(userMessage);

    // Create a placeholder AI message
    const aiMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: "",
      sender: "ai",
      timestamp: Date.now(),
      streaming: true, // Mark as streaming initially
    };

    // Add AI response to messages array
    this.messages.push(aiMessage);

    // Notify sidebar view of initial empty AI message
    this.notifySidebarOfMessage(aiMessage);

    try {
      // Check if model is ready
      if (llmManager.isModelReady()) {
        // Generate AI response using the LLM, with streaming updates
        await llmManager.sendPrompt(messageContent, (chunk) => {
          // Update the message content with each chunk
          aiMessage.content += chunk;

          // Notify the sidebar of the updated message
          this.notifySidebarOfMessage(aiMessage);
        });
      } else {
        // Use a fallback response if no model is loaded
        aiMessage.content = `No LLM model loaded. Please load a .gguf model file to get AI-generated responses. For now, I'll just echo: "${messageContent}"`;
        this.notifySidebarOfMessage(aiMessage);
      }
    } catch (error) {
      // Handle any errors
      console.error("Error generating AI response:", error);
      aiMessage.content += `\n\nError generating response: ${error}`;
      this.notifySidebarOfMessage(aiMessage);
    } finally {
      // Mark streaming as done
      aiMessage.streaming = false;
      this.notifySidebarOfMessage(aiMessage);
    }

    return aiMessage;
  }

  // Stop the current message generation
  stopMessageGeneration(): void {
    llmManager.stopGeneration();
  }

  // Get all chat messages
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  // Get the current LLM state
  getLlmState() {
    return llmManager.getState();
  }

  // Subscribe to LLM state changes
  subscribeLlmStateChanges(callback: (state: any) => void) {
    llmManager.onStateChanged(callback);
  }

  // Unsubscribe from LLM state changes
  unsubscribeLlmStateChanges(callback: (state: any) => void) {
    llmManager.offStateChanged(callback);
  }

  // Notify the sidebar view of a new or updated message
  private notifySidebarOfMessage(message: ChatMessage): void {
    const sidebarView = windowManager.getSidebarView();
    if (sidebarView) {
      sidebarView.webContents.send("chat-message-received", message);
    }
  }
}

// Export a singleton instance
export const sidebarManager = new SidebarManager();
