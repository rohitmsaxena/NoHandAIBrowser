import { contextBridge, ipcRenderer } from "electron";

// Chat message interface
interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: number;
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

  // File dialog functionality
  selectModelFile: () => ipcRenderer.invoke("select-model-file"),

  // Remove listeners (for cleanup)
  removeListeners: () => {
    ipcRenderer.removeAllListeners("sidebar-state-changed");
    ipcRenderer.removeAllListeners("chat-message-received");
  },
});

// Also expose electronAPI for compatibility
contextBridge.exposeInMainWorld("electronAPI", {
  // File dialog functionality
  selectModelFile: () => ipcRenderer.invoke("select-model-file"),
});
