import { BaseWindow, WebContentsView } from "electron";
import path from "node:path";
import { IWindowManager } from "../types/browserTypes";
import {
  NAVIGATION_HEIGHT,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_DEFAULT_STATE,
  SIDEBAR_EXPANDED_WIDTH,
  TAB_BAR_HEIGHT,
} from "../constants/appConstants";
import { tabManager } from "./tabManager";

// Singleton for managing the main application window
export class WindowManager implements IWindowManager {
  private window: BaseWindow | null = null;
  private navigationView: WebContentsView | null = null;
  private tabsView: WebContentsView | null = null;
  private sidebarView: WebContentsView | null = null;
  private isSidebarExpanded: boolean = SIDEBAR_DEFAULT_STATE;

  // Create the main window with navigation, tabs, and sidebar views
  async createWindow(): Promise<BaseWindow> {
    // Define options for the BaseWindow
    const windowOptions = {
      width: 1024,
      height: 768,
      show: false, // Don't show until everything is ready
    };

    // Check if the preload scripts exist
    const preloadPath = path.join(__dirname, "preload.js");
    const tabsPreloadPath = path.join(__dirname, "tabsPreload.js");
    const sidebarPreloadPath = path.join(__dirname, "sidebarPreload.js");

    console.log("Looking for preload scripts:");
    console.log("Main preload:", preloadPath);
    console.log("Tabs preload:", tabsPreloadPath);
    console.log("Sidebar preload:", sidebarPreloadPath);

    // Create the main BaseWindow
    this.window = new BaseWindow(windowOptions);

    // Create the tabs WebContentsView
    this.tabsView = new WebContentsView({
      webPreferences: {
        preload: tabsPreloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        devTools: true,
      },
    });

    // Create the navigation WebContentsView
    this.navigationView = new WebContentsView({
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        devTools: true,
      },
    });

    // Create the sidebar WebContentsView
    this.sidebarView = new WebContentsView({
      webPreferences: {
        preload: sidebarPreloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        devTools: true,
      },
    });

    // Set initial bounds
    const contentBounds = this.window.getContentBounds();
    this.updateViewBounds(contentBounds);

    // Add views to the window using the contentView property
    this.window.contentView.addChildView(this.tabsView);
    this.window.contentView.addChildView(this.navigationView);
    this.window.contentView.addChildView(this.sidebarView);

    // Handle window resize
    this.window.on("resize", () => this.handleResize());

    // Load the UI components
    await this.loadUIComponents();

    return this.window;
  }

  // Get the current window instance
  getWindow(): BaseWindow | null {
    return this.window;
  }

  // Set content bounds for a child view
  setContentBounds(bounds: Electron.Rectangle): void {
    if (this.window) {
      // Implementation can vary based on needs
    }
  }

  // Get content bounds of the main window
  getContentBounds(): Electron.Rectangle {
    if (!this.window) {
      throw new Error("Window not initialized");
    }
    return this.window.getContentBounds();
  }

  // Add a child view to the main window
  addChildView(view: WebContentsView): void {
    if (this.window) {
      this.window.contentView.addChildView(view);
    }
  }

  // Remove a child view from the main window
  removeChildView(view: WebContentsView): void {
    if (this.window) {
      this.window.contentView.removeChildView(view);
    }
  }

  // Get the navigation view
  getNavigationView(): WebContentsView | null {
    return this.navigationView;
  }

  // Get the tabs view
  getTabsView(): WebContentsView | null {
    return this.tabsView;
  }

  // Get the sidebar view
  getSidebarView(): WebContentsView | null {
    return this.sidebarView;
  }

  // Toggle sidebar expanded/collapsed state
  toggleSidebar(): boolean {
    this.isSidebarExpanded = !this.isSidebarExpanded;

    // Update view bounds based on new sidebar state
    if (this.window) {
      const bounds = this.window.getContentBounds();
      this.updateViewBounds(bounds);

      // Notify sidebar of state change
      if (this.sidebarView) {
        this.sidebarView.webContents.send(
          "sidebar-state-changed",
          this.isSidebarExpanded,
        );
      }
    }

    return this.isSidebarExpanded;
  }

  // Get current sidebar state
  getSidebarState(): boolean {
    return this.isSidebarExpanded;
  }

  // Handle window resize events
  private handleResize(): void {
    if (!this.window) return;
    const newBounds = this.window.getContentBounds();
    this.updateViewBounds(newBounds);

    // Notify tab manager to update the active tab's content view
    // This ensures the website display area fills the available space
    tabManager.updateTabLayoutsForSidebar();
  }

  // Update view bounds based on current window size and sidebar state
  private updateViewBounds(bounds: Electron.Rectangle): void {
    if (!this.tabsView || !this.navigationView || !this.sidebarView) return;

    const sidebarWidth = this.isSidebarExpanded
      ? SIDEBAR_EXPANDED_WIDTH
      : SIDEBAR_COLLAPSED_WIDTH;
    const contentWidth = bounds.width - sidebarWidth;

    // Update tabs view bounds
    this.tabsView.setBounds({
      x: 0,
      y: 0,
      width: contentWidth,
      height: TAB_BAR_HEIGHT,
    });

    // Update navigation view bounds
    this.navigationView.setBounds({
      x: 0,
      y: TAB_BAR_HEIGHT,
      width: contentWidth,
      height: NAVIGATION_HEIGHT,
    });

    // Update sidebar view bounds
    this.sidebarView.setBounds({
      x: contentWidth,
      y: 0,
      width: sidebarWidth,
      height: bounds.height,
    });

    // The active tab's content view will be updated by the TabManager
  }

  // Load the UI components (tabs, navigation, and sidebar)
  private async loadUIComponents(): Promise<void> {
    if (
      !this.window ||
      !this.tabsView ||
      !this.navigationView ||
      !this.sidebarView
    )
      return;

    // Load the tabs UI
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.tabsView.webContents.loadURL(
        `${MAIN_WINDOW_VITE_DEV_SERVER_URL}#tabs`,
      );
    } else {
      this.tabsView.webContents.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
        { hash: "tabs" },
      );
    }

    // Load the navigation UI
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.navigationView.webContents.loadURL(
        `${MAIN_WINDOW_VITE_DEV_SERVER_URL}#navigation`,
      );
    } else {
      this.navigationView.webContents.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
        { hash: "navigation" },
      );
    }

    // Load the sidebar UI
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.sidebarView.webContents.loadURL(
        `${MAIN_WINDOW_VITE_DEV_SERVER_URL}#sidebar`,
      );
    } else {
      this.sidebarView.webContents.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
        { hash: "sidebar" },
      );
    }

    // Wait for all UIs to load
    await Promise.all([
      new Promise<void>((resolve) => {
        if (this.tabsView) {
          this.tabsView.webContents.once("did-finish-load", () => resolve());
        } else {
          resolve();
        }
      }),
      new Promise<void>((resolve) => {
        if (this.navigationView) {
          this.navigationView.webContents.once("did-finish-load", () =>
            resolve(),
          );
        } else {
          resolve();
        }
      }),
      new Promise<void>((resolve) => {
        if (this.sidebarView) {
          this.sidebarView.webContents.once("did-finish-load", () => resolve());
        } else {
          resolve();
        }
      }),
    ]);

    // Now we can show the window
    this.window.show();
  }
}

// Export a singleton instance
export const windowManager = new WindowManager();
