import { app, BaseWindow, WebContentsView, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Constants
const TAB_BAR_HEIGHT = 35; // Height for tab bar
const NAVIGATION_HEIGHT = 50; // Height for navigation controls
const HEADER_HEIGHT = TAB_BAR_HEIGHT + NAVIGATION_HEIGHT; // Combined height of tab bar and navigation

// Main window and views
let mainWindow: BaseWindow;
let navigationView: WebContentsView;
let tabsView: WebContentsView;

// Tab management
interface TabInfo {
  id: string;
  contentView: WebContentsView;
  url: string;
  title: string;
  isActive: boolean;
}

const tabs: TabInfo[] = [];
let activeTabId: string | null = null;

const createWindow = () => {
  // Define options for the BaseWindow
  const windowOptions = {
    width: 1024,
    height: 768,
    show: false, // Don't show until everything is ready
  };

  // Check if the preload scripts exist
  const preloadPath = path.join(__dirname, 'preload.js');
  const tabsPreloadPath = path.join(__dirname, 'tabs-preload.js');

  console.log('Looking for preload scripts:');
  console.log('Main preload:', preloadPath);
  console.log('Tabs preload:', tabsPreloadPath);

   // Create the main BaseWindow
  mainWindow = new BaseWindow(windowOptions);

  // Create the tabs WebContentsView
  tabsView = new WebContentsView({
    webPreferences: {
      preload: tabsPreloadPath, // Use the main preload script
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true // Enable DevTools for debugging
    }
  });

  // Create the navigation WebContentsView
  navigationView = new WebContentsView({
    webPreferences: {
      preload: preloadPath, // Use the main preload script
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true // Enable DevTools for debugging
    }
  });

  // Set initial bounds
  const contentBounds = mainWindow.getContentBounds();

  // Set tabs view bounds (at the top)
  tabsView.setBounds({
    x: 0,
    y: 0,
    width: contentBounds.width,
    height: TAB_BAR_HEIGHT
  });

  // Set navigation view bounds (below tabs)
  navigationView.setBounds({
    x: 0,
    y: TAB_BAR_HEIGHT,
    width: contentBounds.width,
    height: NAVIGATION_HEIGHT
  });

  // Add views to the window using the contentView property
  mainWindow.contentView.addChildView(tabsView);
  mainWindow.contentView.addChildView(navigationView);

  // Handle window resize
  mainWindow.on('resize', () => {
    const newBounds = mainWindow.getContentBounds();

    // Update tabs view bounds
    tabsView.setBounds({
      x: 0,
      y: 0,
      width: newBounds.width,
      height: TAB_BAR_HEIGHT
    });

    // Update navigation view bounds
    navigationView.setBounds({
      x: 0,
      y: TAB_BAR_HEIGHT,
      width: newBounds.width,
      height: NAVIGATION_HEIGHT
    });

    // Update all content view bounds
    tabs.forEach(tab => {
      if (tab.isActive) {
        tab.contentView.setBounds({
          x: 0,
          y: HEADER_HEIGHT,
          width: newBounds.width,
          height: newBounds.height - HEADER_HEIGHT
        });
      }
    });
  });

  // Load the tabs UI
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    tabsView.webContents.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#tabs`);
  } else {
    tabsView.webContents.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
        { hash: 'tabs' }
    );
  }

  // Open DevTools for tabs view (helpful for debugging)
  // tabsView.webContents.openDevTools({ mode: 'detach' });

  // Load the navigation UI
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    navigationView.webContents.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#navigation`);
  } else {
    navigationView.webContents.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
        { hash: 'navigation' }
    );
  }

  // Open DevTools for navigation view (helpful for debugging)
  // navigationView.webContents.openDevTools({ mode: 'detach' });

  // Create an initial tab
  createNewTab('https://www.google.com');

  // Set up IPC handlers
  setupIpcHandlers();

  // Show window when everything is loaded
  Promise.all([
    new Promise<void>(resolve => {
      tabsView.webContents.once('did-finish-load', () => resolve());
    }),
    new Promise<void>(resolve => {
      navigationView.webContents.once('did-finish-load', () => resolve());
    })
  ]).then(() => {
    mainWindow.show();

    // Send initial tabs data
    tabsView.webContents.send('tabs-updated', getTabs());
  });
};

// Create a new tab with the given URL
function createNewTab(url: string) {
  const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create a new WebContentsView for this tab
  const contentView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    }
  });

  // Set the bounds for the content view (only visible for active tab)
  const contentBounds = mainWindow.getContentBounds();
  contentView.setBounds({
    x: 0,
    y: HEADER_HEIGHT,
    width: contentBounds.width,
    height: contentBounds.height - HEADER_HEIGHT
  });

  // Create the tab info
  const newTab: TabInfo = {
    id: tabId,
    contentView,
    url,
    title: 'Loading...', // Will be updated when page title is available
    isActive: false
  };

  // Add to list of tabs
  tabs.push(newTab);

  // Add the content view to the window using the contentView property
  mainWindow.contentView.addChildView(contentView);

  // Load the URL
  contentView.webContents.loadURL(url);

  // Set up events for this tab
  setupTabEvents(newTab);

  // Activate this tab
  setActiveTab(tabId);

  return tabId;
}

// Set up events for a tab's WebContentsView
function setupTabEvents(tab: TabInfo) {
  const { contentView, id } = tab;

  // Update URL in navigation bar when page navigates
  contentView.webContents.on('did-navigate', () => {
    const currentUrl = contentView.webContents.getURL();
    tab.url = currentUrl;

    if (tab.isActive) {
      navigationView.webContents.send('url-changed', currentUrl);
    }

    // If no title is set yet, use the domain as a temporary title
    if (!tab.title || tab.title === 'Loading...') {
      try {
        const url = new URL(currentUrl);
        const domain = url.hostname;
        updateTabInfo(id, { url: currentUrl, title: domain });
      } catch {
        // If URL parsing fails, just update the URL
        updateTabInfo(id, { url: currentUrl });
      }
    } else {
      // Just update the URL
      updateTabInfo(id, { url: currentUrl });
    }
  });

  // Update URL in navigation bar for in-page navigation (e.g., hash changes)
  contentView.webContents.on('did-navigate-in-page', () => {
    const currentUrl = contentView.webContents.getURL();
    tab.url = currentUrl;

    if (tab.isActive) {
      navigationView.webContents.send('url-changed', currentUrl);
    }

    // Update tab info
    updateTabInfo(id, { url: currentUrl });
  });

  // Update tab title when page title changes
  contentView.webContents.on('page-title-updated', (event, title) => {
    // Only update if we have a meaningful title
    if (title && title.trim() !== '') {
      tab.title = title;

      // Update tab info
      updateTabInfo(id, { title });
    }
  });

  // Handle loading states
  contentView.webContents.on('did-start-loading', () => {
    if (tab.isActive) {
      navigationView.webContents.send('loading-changed', true);
    }
  });

  contentView.webContents.on('did-stop-loading', () => {
    // If we still don't have a proper title, try to use the domain
    if (!tab.title || tab.title === 'Loading...') {
      try {
        const currentUrl = contentView.webContents.getURL();
        const url = new URL(currentUrl);
        const domain = url.hostname;
        tab.title = domain || 'New Tab';
        updateTabInfo(id, { title: tab.title });
      } catch {
        // If that fails, just use "New Tab"
        tab.title = 'New Tab';
        updateTabInfo(id, { title: tab.title });
      }
    }

    if (tab.isActive) {
      navigationView.webContents.send('loading-changed', false);
    }
  });
}

// Update tab information and notify the tabs view
function updateTabInfo(tabId: string, updates: Partial<TabInfo>) {
  const tabIndex = tabs.findIndex(tab => tab.id === tabId);
  if (tabIndex === -1) return;

  // Update the tab info
  tabs[tabIndex] = { ...tabs[tabIndex], ...updates };

  // Notify the tabs view
  tabsView.webContents.send('tabs-updated', getTabs());
}

// Get simplified tab info for sending to the renderer
function getTabs() {
  return tabs.map(({ id, url, title, isActive }) => ({
    id,
    url,
    title,
    isActive
  }));
}

// Set the active tab
function setActiveTab(tabId: string) {
  const contentBounds = mainWindow.getContentBounds();

  // Deactivate current active tab
  tabs.forEach(tab => {
    if (tab.id === tabId) {
      // Show and position the content view for the active tab
      tab.isActive = true;
      tab.contentView.setBounds({
        x: 0,
        y: HEADER_HEIGHT,
        width: contentBounds.width,
        height: contentBounds.height - HEADER_HEIGHT
      });

      // Update navigation URL
      navigationView.webContents.send('url-changed', tab.url);
      navigationView.webContents.send('loading-changed', tab.contentView.webContents.isLoading());

      // Set as active tab
      activeTabId = tabId;
    } else {
      // Hide other tabs
      tab.isActive = false;
      tab.contentView.setBounds({
        x: 0,
        y: HEADER_HEIGHT,
        width: contentBounds.width,
        height: 0 // Set height to 0 to hide
      });
    }
  });

  // Update tabs UI
  tabsView.webContents.send('tabs-updated', getTabs());
}

// Close a tab
function closeTab(tabId: string) {
  const tabIndex = tabs.findIndex(tab => tab.id === tabId);
  if (tabIndex === -1) return;

  const isActiveTab = tabs[tabIndex].isActive;

  // Get the content view to destroy
  const contentView = tabs[tabIndex].contentView;

  // Remove from tabs array
  tabs.splice(tabIndex, 1);

  // Remove from window using the contentView property
  mainWindow.contentView.removeChildView(contentView);

  // If there are no more tabs, create a new one
  if (tabs.length === 0) {
    createNewTab('https://www.goole.com');
    return;
  }

  // If we closed the active tab, activate the next tab
  if (isActiveTab) {
    const newActiveIndex = Math.min(tabIndex, tabs.length - 1);
    setActiveTab(tabs[newActiveIndex].id);
  }

  // Update tabs UI
  tabsView.webContents.send('tabs-updated', getTabs());
}

function setupIpcHandlers() {
  // Tab management
  ipcMain.handle('create-tab', async (_event, url = 'https://www.google.com') => {
    return createNewTab(url);
  });

  ipcMain.handle('close-tab', async (_event, tabId) => {
    closeTab(tabId);
    return true;
  });

  ipcMain.handle('switch-tab', async (_event, tabId) => {
    setActiveTab(tabId);
    return true;
  });

  ipcMain.handle('get-tabs', () => {
    return getTabs();
  });

  // Navigate to URL in the active tab
  ipcMain.handle('navigate-to', async (_event, url: string) => {
    const activeTab = tabs.find(tab => tab.isActive);
    if (!activeTab) return false;

    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    try {
      await activeTab.contentView.webContents.loadURL(url);
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      return false;
    }
  });

  // Go back
  ipcMain.handle('go-back', () => {
    const activeTab = tabs.find(tab => tab.isActive);
    if (!activeTab) return false;

    if (activeTab.contentView.webContents.navigationHistory.canGoBack()) {
      activeTab.contentView.webContents.navigationHistory.goBack();
      return true;
    }
    return false;
  });

  // Go forward
  ipcMain.handle('go-forward', () => {
    const activeTab = tabs.find(tab => tab.isActive);
    if (!activeTab) return false;

    if (activeTab.contentView.webContents.navigationHistory.canGoForward()) {
      activeTab.contentView.webContents.navigationHistory.goForward();
      return true;
    }
    return false;
  });

  // Get current URL
  ipcMain.handle('get-current-url', () => {
    const activeTab = tabs.find(tab => tab.isActive);
    return activeTab ? activeTab.contentView.webContents.getURL() : '';
  });
}

// This method will be called when Electron has finished initialization
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create a window when the dock icon is clicked and no other windows are open
  if (BaseWindow.getAllWindows().length === 0) {
    createWindow();
  }
});