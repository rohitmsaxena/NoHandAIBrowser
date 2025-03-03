import { BaseWindow, WebContentsView } from "electron";
import path from "node:path";
import { IWindowManager } from "../types/browserTypes";
import {
  TAB_BAR_HEIGHT,
  NAVIGATION_HEIGHT,
  HEADER_HEIGHT,
} from "../constants/appConstants";

// Singleton for managing the main application window
export class WindowManager implements IWindowManager {
  private window: BaseWindow | null = null;
  private navigationView: WebContentsView | null = null;
  private tabsView: WebContentsView | null = null;

  // Create the main window with navigation and tabs views
  async createWindow(): Promise<BaseWindow> {
    // Define options for the BaseWindow
    const windowOptions = {
      width: 1024,
      height: 768,
      show: false, // Don't show until everything is ready
    };

    // Check if the preload scripts exist
    const preloadPath = path.join(__dirname, "preload.js");
    const tabsPreloadPath = path.join(__dirname, "tabs-preload.js");

    console.log("Looking for preload scripts:");
    console.log("Main preload:", preloadPath);
    console.log("Tabs preload:", tabsPreloadPath);

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

    // Set initial bounds
    const contentBounds = this.window.getContentBounds();

    // Set tabs view bounds (at the top)
    this.tabsView.setBounds({
      x: 0,
      y: 0,
      width: contentBounds.width,
      height: TAB_BAR_HEIGHT,
    });

    // Set navigation view bounds (below tabs)
    this.navigationView.setBounds({
      x: 0,
      y: TAB_BAR_HEIGHT,
      width: contentBounds.width,
      height: NAVIGATION_HEIGHT,
    });

    // Add views to the window using the contentView property
    this.window.contentView.addChildView(this.tabsView);
    this.window.contentView.addChildView(this.navigationView);

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

  // Handle window resize events
  private handleResize(): void {
    if (!this.window || !this.tabsView || !this.navigationView) return;

    const newBounds = this.window.getContentBounds();

    // Update tabs view bounds
    this.tabsView.setBounds({
      x: 0,
      y: 0,
      width: newBounds.width,
      height: TAB_BAR_HEIGHT,
    });

    // Update navigation view bounds
    this.navigationView.setBounds({
      x: 0,
      y: TAB_BAR_HEIGHT,
      width: newBounds.width,
      height: NAVIGATION_HEIGHT,
    });

    // The active tab's content view will be updated by the TabManager
  }

  // Load the UI components (tabs and navigation)
  private async loadUIComponents(): Promise<void> {
    if (!this.window || !this.tabsView || !this.navigationView) return;

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

    // Wait for both UIs to load
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
    ]);

    // Now we can show the window
    this.window.show();
  }
}

// Export a singleton instance
export const windowManager = new WindowManager();
