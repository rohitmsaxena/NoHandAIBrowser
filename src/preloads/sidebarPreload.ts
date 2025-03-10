import { contextBridge, ipcRenderer } from "electron";
import "./sidebarBirpcPreload"; // Import the birpc preload

// Chat message interface
interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "ai" | "system";
  timestamp: number;
  streaming?: boolean;
}

// LLM State interface
interface LlmState {
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

// Expose protected methods for sidebar
contextBridge.exposeInMainWorld("sidebarAPI", {
  // Sidebar state
  toggleSidebar: () => ipcRenderer.invoke("toggle-sidebar"),
  getSidebarState: () => ipcRenderer.invoke("get-sidebar-state"),

  // Listen for sidebar state changes
  onSidebarStateChanged: (callback: (isExpanded: boolean) => void) => {
    // Remove any existing listeners to avoid duplicates
    ipcRenderer.removeAllListeners("sidebar-state-changed");
    // Add the new listener
    ipcRenderer.on("sidebar-state-changed", (_event, isExpanded) =>
      callback(isExpanded),
    );
  },

  // AI Chat functionality
  sendChatMessage: (message: string) =>
    ipcRenderer.invoke("send-chat-message", message),

  stopChatGeneration: () => ipcRenderer.invoke("stop-chat-generation"),

  // Listen for new chat messages
  onChatMessageReceived: (callback: (message: ChatMessage) => void) => {
    // Remove any existing listeners to avoid duplicates
    ipcRenderer.removeAllListeners("chat-message-received");
    // Add the new listener
    ipcRenderer.on("chat-message-received", (_event, message) =>
      callback(message),
    );
  },

  // LLM management
  selectModelFile: () => ipcRenderer.invoke("select-model-file"),
  getLlmState: () => ipcRenderer.invoke("get-llm-state"),

  // Listen for LLM state changes
  onLlmStateChanged: (callback: (state: LlmState) => void) => {
    // Remove any existing listeners to avoid duplicates
    ipcRenderer.removeAllListeners("llm-state-changed");
    // Add the new listener
    ipcRenderer.on("llm-state-changed", (_event, state) => callback(state));
  },

  // Remove listeners (for cleanup)
  removeListeners: () => {
    ipcRenderer.removeAllListeners("sidebar-state-changed");
    ipcRenderer.removeAllListeners("chat-message-received");
    ipcRenderer.removeAllListeners("llm-state-changed");
  },
});
