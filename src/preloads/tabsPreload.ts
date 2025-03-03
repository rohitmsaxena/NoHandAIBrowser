import { contextBridge, ipcRenderer } from "electron";

// Tab information type
interface TabInfo {
  id: string;
  url: string;
  title: string;
  isActive: boolean;
}

// Expose protected methods for tab management
contextBridge.exposeInMainWorld("tabsAPI", {
  // Tab management
  createTab: (url?: string) => ipcRenderer.invoke("create-tab", url),
  closeTab: (tabId: string) => ipcRenderer.invoke("close-tab", tabId),
  switchTab: (tabId: string) => ipcRenderer.invoke("switch-tab", tabId),
  getTabs: () => ipcRenderer.invoke("get-tabs"),

  // Listen for tab updates
  onTabsUpdated: (callback: (tabs: TabInfo[]) => void) => {
    // Remove any existing listeners to avoid duplicates
    ipcRenderer.removeAllListeners("tabs-updated");
    // Add the new listener
    ipcRenderer.on("tabs-updated", (_event, tabs) => callback(tabs));
  },

  // Remove listeners (for cleanup)
  removeTabsUpdatedListener: () => {
    ipcRenderer.removeAllListeners("tabs-updated");
  },
});
