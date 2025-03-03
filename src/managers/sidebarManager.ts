import { windowManager } from "./windowManager";
import { tabManager } from "./tabManager";

// Interface for chat message
interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: number;
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

    // Generate AI response (in a real app, this would call an AI service)
    const aiResponse = await this.generateAIResponse(messageContent);

    // Add AI response to messages array
    this.messages.push(aiResponse);

    // Notify sidebar view of AI response
    this.notifySidebarOfMessage(aiResponse);

    return aiResponse;
  }

  // Get all chat messages
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  // Notify the sidebar view of a new message
  private notifySidebarOfMessage(message: ChatMessage): void {
    const sidebarView = windowManager.getSidebarView();
    if (sidebarView) {
      sidebarView.webContents.send("chat-message-received", message);
    }
  }

  // Generate an AI response (placeholder implementation)
  private async generateAIResponse(userMessage: string): Promise<ChatMessage> {
    // In a real implementation, this would call your offline AI service
    // For now, we'll just echo the message back with a prefix

    // Simulate a delay for the AI "thinking"
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: `AI Response: I received your message: "${userMessage}"`,
      sender: "ai",
      timestamp: Date.now(),
    };
  }
}

// Export a singleton instance
export const sidebarManager = new SidebarManager();
