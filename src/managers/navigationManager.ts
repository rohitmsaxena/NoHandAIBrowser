import { INavigationManager } from "../types/browserTypes";
import { tabManager } from "./tabManager";

export class NavigationManager implements INavigationManager {
  // Navigate to a URL in the active tab
  async navigateToUrl(url: string): Promise<boolean> {
    const activeTab = tabManager.getActiveTab();
    if (!activeTab) return false;

    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    try {
      await activeTab.contentView.webContents.loadURL(url);
      return true;
    } catch (error) {
      console.error("Navigation error:", error);
      return false;
    }
  }

  // Go back in the active tab's history
  goBack(): boolean {
    const activeTab = tabManager.getActiveTab();
    if (!activeTab) return false;

    if (activeTab.contentView.webContents.navigationHistory.canGoBack()) {
      activeTab.contentView.webContents.navigationHistory.goBack();
      return true;
    }
    return false;
  }

  // Go forward in the active tab's history
  goForward(): boolean {
    const activeTab = tabManager.getActiveTab();
    if (!activeTab) return false;

    if (activeTab.contentView.webContents.navigationHistory.canGoForward()) {
      activeTab.contentView.webContents.navigationHistory.goForward();
      return true;
    }
    return false;
  }

  // Get the current URL of the active tab
  getCurrentUrl(): string {
    const activeTab = tabManager.getActiveTab();
    return activeTab ? activeTab.contentView.webContents.getURL() : "";
  }
}

// Export a singleton instance
export const navigationManager = new NavigationManager();
