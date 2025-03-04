import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../constants/appConstants";

// Expose protected methods for navigation control
contextBridge.exposeInMainWorld("electronAPI", {
  // Navigation functions
  navigateTo: (url: string) => ipcRenderer.invoke("navigate-to", url),
  goBack: () => ipcRenderer.invoke("go-back"),
  goForward: () => ipcRenderer.invoke("go-forward"),
  getCurrentUrl: () => ipcRenderer.invoke("get-current-url"),

  // Event listeners
  onUrlChange: (callback: (url: string) => void) => {
    // Remove any existing listeners to avoid duplicates
    ipcRenderer.removeAllListeners("url-changed");
    // Add the new listener
    ipcRenderer.on("url-changed", (_event, url) => callback(url));
  },

  onLoadingChange: (callback: (isLoading: boolean) => void) => {
    // Remove any existing listeners to avoid duplicates
    ipcRenderer.removeAllListeners("loading-changed");
    // Add the new listener
    ipcRenderer.on("loading-changed", (_event, isLoading) =>
      callback(isLoading),
    );
  },

  // Tab functions directly accessible from the navigation bar
  createTab: (url?: string) => ipcRenderer.invoke("create-tab", url),

  // Model file selection
  selectModelFile: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_MODEL_FILE),

  // Cleanup functions
  removeListeners: () => {
    ipcRenderer.removeAllListeners("url-changed");
    ipcRenderer.removeAllListeners("loading-changed");
  },
});
