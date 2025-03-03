import { WebContentsView } from "electron";
import { ITabManager, RendererTabInfo, TabInfo } from "../types/browserTypes";
import { windowManager } from "./windowManager";
import {
  DEFAULT_URL,
  HEADER_HEIGHT,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
} from "../constants/appConstants";

export class TabManager implements ITabManager {
  private tabs: TabInfo[] = [];
  private activeTabId: string | null = null;

  // Create a new tab with a given URL
  createTab(url: string = DEFAULT_URL): string {
    const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create a new WebContentsView for this tab
    const contentView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    // Set initial bounds (only visible for active tab)
    const contentBounds = windowManager.getContentBounds();
    const isSidebarExpanded = windowManager.getSidebarState();
    const sidebarWidth = isSidebarExpanded
      ? SIDEBAR_EXPANDED_WIDTH
      : SIDEBAR_COLLAPSED_WIDTH;

    contentView.setBounds({
      x: 0,
      y: HEADER_HEIGHT,
      width: contentBounds.width - sidebarWidth,
      height: contentBounds.height - HEADER_HEIGHT,
    });

    // Create tab info
    const newTab: TabInfo = {
      id: tabId,
      contentView,
      url,
      title: "Loading...",
      isActive: false,
    };

    // Add to list of tabs
    this.tabs.push(newTab);

    // Add the content view to the window
    windowManager.addChildView(contentView);

    // Load the URL
    contentView.webContents.loadURL(url);

    // Set up events for this tab
    this.setupTabEvents(newTab);

    // Activate this tab
    this.activateTab(tabId);

    return tabId;
  }

  // Close a tab by ID
  closeTab(tabId: string): void {
    const tabIndex = this.tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex === -1) return;

    const isActiveTab = this.tabs[tabIndex].isActive;

    // Get the content view to destroy
    const contentView = this.tabs[tabIndex].contentView;

    // Remove from tabs array
    this.tabs.splice(tabIndex, 1);

    // Remove from window
    windowManager.removeChildView(contentView);

    // If there are no more tabs, create a new one
    if (this.tabs.length === 0) {
      this.createTab(DEFAULT_URL);
      return;
    }

    // If we closed the active tab, activate the next tab
    if (isActiveTab) {
      const newActiveIndex = Math.min(tabIndex, this.tabs.length - 1);
      this.activateTab(this.tabs[newActiveIndex].id);
    }

    // Update tabs UI
    this.notifyTabsUpdated();
  }

  // Activate a tab by ID
  activateTab(tabId: string): void {
    const contentBounds = windowManager.getContentBounds();
    const isSidebarExpanded = windowManager.getSidebarState();
    const sidebarWidth = isSidebarExpanded
      ? SIDEBAR_EXPANDED_WIDTH
      : SIDEBAR_COLLAPSED_WIDTH;

    // Deactivate current active tab and activate the new one
    this.tabs.forEach((tab) => {
      if (tab.id === tabId) {
        // Show and position the content view for the active tab
        tab.isActive = true;
        tab.contentView.setBounds({
          x: 0,
          y: HEADER_HEIGHT,
          width: contentBounds.width - sidebarWidth,
          height: contentBounds.height - HEADER_HEIGHT,
        });

        // Set as active tab
        this.activeTabId = tabId;
      } else {
        // Hide other tabs
        tab.isActive = false;
        tab.contentView.setBounds({
          x: 0,
          y: HEADER_HEIGHT,
          width: contentBounds.width - sidebarWidth,
          height: 0, // Set height to 0 to hide
        });
      }
    });

    // Update tabs UI
    this.notifyTabsUpdated();

    // Update navigation UI
    this.notifyNavigationUpdated();
  }

  // Adjust tab layouts when sidebar state changes or window is resized
  updateTabLayoutsForSidebar(): void {
    const contentBounds = windowManager.getContentBounds();
    const isSidebarExpanded = windowManager.getSidebarState();
    const sidebarWidth = isSidebarExpanded
      ? SIDEBAR_EXPANDED_WIDTH
      : SIDEBAR_COLLAPSED_WIDTH;

    // Update the active tab's bounds
    const activeTab = this.getActiveTab();
    if (activeTab) {
      activeTab.contentView.setBounds({
        x: 0,
        y: HEADER_HEIGHT,
        width: contentBounds.width - sidebarWidth,
        height: contentBounds.height - HEADER_HEIGHT,
      });
    }

    // Also update any hidden tabs to maintain proper sizing
    this.tabs.forEach((tab) => {
      if (!tab.isActive) {
        tab.contentView.setBounds({
          x: 0,
          y: HEADER_HEIGHT,
          width: contentBounds.width - sidebarWidth,
          height: 0, // Height is 0 for hidden tabs
        });
      }
    });
  }

  // Get all tabs (simplified for renderer)
  getTabs(): RendererTabInfo[] {
    return this.tabs.map(({ id, url, title, isActive }) => ({
      id,
      url,
      title,
      isActive,
    }));
  }

  // Get the currently active tab
  getActiveTab(): TabInfo | undefined {
    return this.tabs.find((tab) => tab.isActive);
  }

  // Update tab information
  updateTabInfo(tabId: string, updates: Partial<TabInfo>): void {
    const tabIndex = this.tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex === -1) return;

    // Update the tab info
    this.tabs[tabIndex] = { ...this.tabs[tabIndex], ...updates };

    // Notify the tabs view
    this.notifyTabsUpdated();
  }

  // Notify the tabs view of updates
  private notifyTabsUpdated(): void {
    const tabsView = windowManager.getTabsView();
    if (tabsView) {
      tabsView.webContents.send("tabs-updated", this.getTabs());
    }
  }

  // Notify the navigation view of updates
  private notifyNavigationUpdated(): void {
    const activeTab = this.getActiveTab();
    if (!activeTab) return;

    const navigationView = windowManager.getNavigationView();
    if (navigationView) {
      navigationView.webContents.send("url-changed", activeTab.url);
      navigationView.webContents.send(
        "loading-changed",
        activeTab.contentView.webContents.isLoading(),
      );
    }
  }

  // Set up events for a tab's WebContentsView
  private setupTabEvents(tab: TabInfo): void {
    const { contentView, id } = tab;

    // Update URL in navigation bar when page navigates
    contentView.webContents.on("did-navigate", () => {
      const currentUrl = contentView.webContents.getURL();
      tab.url = currentUrl;

      if (tab.isActive) {
        const navigationView = windowManager.getNavigationView();
        if (navigationView) {
          navigationView.webContents.send("url-changed", currentUrl);
        }
      }

      // If no title is set yet, use the domain as a temporary title
      if (!tab.title || tab.title === "Loading...") {
        try {
          const url = new URL(currentUrl);
          const domain = url.hostname;
          this.updateTabInfo(id, { url: currentUrl, title: domain });
        } catch {
          // If URL parsing fails, just update the URL
          this.updateTabInfo(id, { url: currentUrl });
        }
      } else {
        // Just update the URL
        this.updateTabInfo(id, { url: currentUrl });
      }
    });

    // Update URL for in-page navigation (e.g., hash changes)
    contentView.webContents.on("did-navigate-in-page", () => {
      const currentUrl = contentView.webContents.getURL();
      tab.url = currentUrl;

      if (tab.isActive) {
        const navigationView = windowManager.getNavigationView();
        if (navigationView) {
          navigationView.webContents.send("url-changed", currentUrl);
        }
      }

      // Update tab info
      this.updateTabInfo(id, { url: currentUrl });
    });

    // Update tab title when page title changes
    contentView.webContents.on("page-title-updated", (event, title) => {
      // Only update if we have a meaningful title
      if (title && title.trim() !== "") {
        tab.title = title;

        // Update tab info
        this.updateTabInfo(id, { title });
      }
    });

    // Handle loading states
    contentView.webContents.on("did-start-loading", () => {
      if (tab.isActive) {
        const navigationView = windowManager.getNavigationView();
        if (navigationView) {
          navigationView.webContents.send("loading-changed", true);
        }
      }
    });

    contentView.webContents.on("did-stop-loading", () => {
      // If we still don't have a proper title, try to use the domain
      if (!tab.title || tab.title === "Loading...") {
        try {
          const currentUrl = contentView.webContents.getURL();
          const url = new URL(currentUrl);
          const domain = url.hostname;
          tab.title = domain || "New Tab";
          this.updateTabInfo(id, { title: tab.title });
        } catch {
          // If that fails, just use "New Tab"
          tab.title = "New Tab";
          this.updateTabInfo(id, { title: tab.title });
        }
      }

      if (tab.isActive) {
        const navigationView = windowManager.getNavigationView();
        if (navigationView) {
          navigationView.webContents.send("loading-changed", false);
        }
      }
    });
  }
}

// Export a singleton instance
export const tabManager = new TabManager();
