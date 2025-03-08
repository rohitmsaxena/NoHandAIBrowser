import { contextBridge, ipcRenderer } from "electron";
import { AI_IPC_CHANNELS } from "../ipc/aiIpcHandler";

// Chat message interface
interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: number;
}

// Model config interface (needs to match the one in modelManager.ts)
interface ModelConfig {
  id: string;
  name: string;
  description: string;
  path: string;
  parameters: number;
  contextSize: number;
  isLoaded: boolean;
  type: "chat" | "vision" | "embedding";
  quantization: "4-bit" | "5-bit" | "8-bit" | "none";
  size: number;
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

  // Listen for new chat messages
  onChatMessageReceived: (callback: (message: ChatMessage) => void) => {
    // Remove any existing listeners to avoid duplicates
    ipcRenderer.removeAllListeners("chat-message-received");
    // Add the new listener
    ipcRenderer.on("chat-message-received", (_event, message) =>
      callback(message),
    );
  },

  // Remove listeners (for cleanup)
  removeListeners: () => {
    ipcRenderer.removeAllListeners("sidebar-state-changed");
    ipcRenderer.removeAllListeners("chat-message-received");
  },
});

// Also expose electronAPI for compatibility with navigation and file dialogs
contextBridge.exposeInMainWorld("electronAPI", {
  // File dialog functionality
  selectModelFile: () => ipcRenderer.invoke("select-model-file"),
});

// Expose AI API functionality
contextBridge.exposeInMainWorld("aiAPI", {
  // Model management
  getAvailableModels: () =>
    ipcRenderer.invoke(AI_IPC_CHANNELS.GET_AVAILABLE_MODELS),
  registerModel: (config: Omit<ModelConfig, "isLoaded">) =>
    ipcRenderer.invoke(AI_IPC_CHANNELS.REGISTER_MODEL, config),
  loadModel: (modelId: string) =>
    ipcRenderer.invoke(AI_IPC_CHANNELS.LOAD_MODEL, modelId),
  unloadModel: (modelId: string) =>
    ipcRenderer.invoke(AI_IPC_CHANNELS.UNLOAD_MODEL, modelId),
  getLoadedModels: () => ipcRenderer.invoke(AI_IPC_CHANNELS.GET_LOADED_MODELS),

  // Event listeners for model loading/unloading
  onModelLoaded: (callback: (modelId: string) => void) => {
    ipcRenderer.removeAllListeners(AI_IPC_CHANNELS.MODEL_LOADED);
    ipcRenderer.on(AI_IPC_CHANNELS.MODEL_LOADED, (_event, modelId) =>
      callback(modelId),
    );
  },
  onModelUnloaded: (callback: (modelId: string) => void) => {
    ipcRenderer.removeAllListeners(AI_IPC_CHANNELS.MODEL_UNLOADED);
    ipcRenderer.on(AI_IPC_CHANNELS.MODEL_UNLOADED, (_event, modelId) =>
      callback(modelId),
    );
  },

  // Cleanup helpers
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners(AI_IPC_CHANNELS.MODEL_LOADED);
    ipcRenderer.removeAllListeners(AI_IPC_CHANNELS.MODEL_UNLOADED);
  },
});
