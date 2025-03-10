import { createMainSideBirpc } from "../utils/birpcUtils";
import { llmManager, LlmState } from "./llmManager";
import { sidebarManager } from "./sidebarManager";
import { windowManager } from "./windowManager";
import { WebContentsView } from "electron";

// Define the types for our RPC functions
// Functions exposed to the renderer process
export interface MainFunctions {
  // Sidebar functions
  toggleSidebar: () => Promise<boolean>;
  getSidebarState: () => Promise<boolean>;

  // Chat functions
  sendChatMessage: (message: string) => Promise<ChatMessage>;
  stopChatGeneration: () => Promise<void>;
  getChatMessages: () => Promise<ChatMessage[]>;

  // LLM functions
  selectModelFile: () => Promise<boolean>;
  getLlmState: () => Promise<LlmState>;
}

// Functions that can be called from the main process
export interface RendererFunctions {
  // Event notifications
  onSidebarStateChanged: (isExpanded: boolean) => void;
  onChatMessageReceived: (message: ChatMessage) => void;
  onLlmStateChanged: (state: LlmState) => void;
}

// Chat message interface
export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "ai" | "system";
  timestamp: number;
  streaming?: boolean;
}

export class BirpcManager {
  private sidebarRpc: ReturnType<
    typeof createMainSideBirpc<RendererFunctions, MainFunctions>
  > | null = null;
  private sidebarState = false;

  // Initialize the RPC connections
  initialize(sidebarWindow: WebContentsView) {
    // Store initial sidebar state
    this.sidebarState = sidebarManager.getSidebarState();

    // Create the RPC for the sidebar
    this.sidebarRpc = createMainSideBirpc<RendererFunctions, MainFunctions>(
      "sidebar-rpc",
      sidebarWindow.webContents,
      {
        // Sidebar functions
        toggleSidebar: async () => {
          return sidebarManager.toggleSidebar();
        },
        getSidebarState: async () => {
          return sidebarManager.getSidebarState();
        },

        // Chat functions
        sendChatMessage: async (message) => {
          return sidebarManager.sendChatMessage(message);
        },
        stopChatGeneration: async () => {
          sidebarManager.stopMessageGeneration();
        },
        getChatMessages: async () => {
          return sidebarManager.getMessages();
        },

        // LLM functions
        selectModelFile: async () => {
          return sidebarManager.selectModelFile();
        },
        getLlmState: async () => {
          return llmManager.getState();
        },
      },
    );

    // Set up listeners
    this.setupListeners();
  }

  // Set up event listeners
  private setupListeners() {
    // Listen for LLM state changes
    llmManager.onStateChanged((state) => {
      if (this.sidebarRpc) {
        this.sidebarRpc.onLlmStateChanged(state);
      }
    });

    // Listen for sidebar state changes
    windowManager.onSidebarStateChanged((isExpanded) => {
      // Only notify if there's a change
      if (this.sidebarRpc && this.sidebarState !== isExpanded) {
        this.sidebarState = isExpanded;
        this.sidebarRpc.onSidebarStateChanged(isExpanded);
      }
    });
  }

  // Notify the sidebar of a new or updated chat message
  notifyChatMessage(message: ChatMessage) {
    if (this.sidebarRpc) {
      this.sidebarRpc.onChatMessageReceived(message);
    }
  }
}

// Export singleton instance
export const birpcManager = new BirpcManager();
