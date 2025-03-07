import { ipcMain } from "electron";
import { tabManager } from "../managers/tabManager";
import { navigationManager } from "../managers/navigationManager";
import { sidebarManager } from "../managers/sidebarManager";
import { IPC_CHANNELS } from "../constants/appConstants";

export class IpcHandler {
  // Setup all IPC handlers
  setupHandlers(): void {
    this.setupTabHandlers();
    this.setupNavigationHandlers();
    this.setupSidebarHandlers();
  }

  // Setup IPC handlers for tab management
  private setupTabHandlers(): void {
    // Create a new tab
    ipcMain.handle(IPC_CHANNELS.CREATE_TAB, async (_event, url) => {
      return tabManager.createTab(url);
    });

    // Close a tab
    ipcMain.handle(IPC_CHANNELS.CLOSE_TAB, async (_event, tabId) => {
      tabManager.closeTab(tabId);
      return true;
    });

    // Switch to a tab
    ipcMain.handle(IPC_CHANNELS.SWITCH_TAB, async (_event, tabId) => {
      tabManager.activateTab(tabId);
      return true;
    });

    // Get all tabs
    ipcMain.handle(IPC_CHANNELS.GET_TABS, () => {
      return tabManager.getTabs();
    });
  }

  // Setup IPC handlers for navigation
  private setupNavigationHandlers(): void {
    // Navigate to URL
    ipcMain.handle(IPC_CHANNELS.NAVIGATE_TO, async (_event, url) => {
      return navigationManager.navigateToUrl(url);
    });

    // Go back
    ipcMain.handle(IPC_CHANNELS.GO_BACK, () => {
      return navigationManager.goBack();
    });

    // Go forward
    ipcMain.handle(IPC_CHANNELS.GO_FORWARD, () => {
      return navigationManager.goForward();
    });

    // Get current URL
    ipcMain.handle(IPC_CHANNELS.GET_CURRENT_URL, () => {
      return navigationManager.getCurrentUrl();
    });
  }

  // Setup IPC handlers for sidebar
  private setupSidebarHandlers(): void {
    // Toggle sidebar
    ipcMain.handle(IPC_CHANNELS.TOGGLE_SIDEBAR, () => {
      return sidebarManager.toggleSidebar();
    });

    // Get sidebar state
    ipcMain.handle(IPC_CHANNELS.GET_SIDEBAR_STATE, () => {
      return sidebarManager.getSidebarState();
    });

    // Send chat message
    ipcMain.handle(IPC_CHANNELS.SEND_CHAT_MESSAGE, async (_event, message) => {
      return sidebarManager.sendChatMessage(message);
    });
  }
}

// Export a singleton instance
export const ipcHandler = new IpcHandler();
