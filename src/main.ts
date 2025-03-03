import { app, BaseWindow, WebContentsView, ipcMain, BrowserWindowConstructorOptions } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BaseWindow;
let navigationView: WebContentsView;
let contentView: WebContentsView;

const HEADER_HEIGHT = 70; // Height for navigation controls

const createWindow = () => {
  // Define options for the BaseWindow
  const windowOptions: BrowserWindowConstructorOptions = {
    width: 1024,
    height: 768,
    show: false, // Don't show until everything is ready
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  };

  // Create the main BaseWindow
  mainWindow = new BaseWindow(windowOptions);

  // Create the navigation WebContentsView for browser controls
  navigationView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Create the content WebContentsView for web page rendering
  contentView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    }
  });

  // Set bounds for navigation view (top part of the window)
  const contentBounds = mainWindow.getContentBounds();
  navigationView.setBounds({
    x: 0,
    y: 0,
    width: contentBounds.width,
    height: HEADER_HEIGHT
  });

  // Set bounds for content view (bottom part of the window)
  contentView.setBounds({
    x: 0,
    y: HEADER_HEIGHT,
    width: contentBounds.width,
    height: contentBounds.height - HEADER_HEIGHT
  });

  // Add views to the window
  mainWindow.contentView.addChildView(navigationView);
  mainWindow.contentView.addChildView(contentView);

  // Handle window resize
  mainWindow.on('resize', () => {
    const newBounds = mainWindow.getContentBounds();

    // Update navigation view bounds
    navigationView.setBounds({
      x: 0,
      y: 0,
      width: newBounds.width,
      height: HEADER_HEIGHT
    });

    // Update content view bounds
    contentView.setBounds({
      x: 0,
      y: HEADER_HEIGHT,
      width: newBounds.width,
      height: newBounds.height - HEADER_HEIGHT
    });
  });

  // Load navigation UI in the navigation view
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    navigationView.webContents.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    navigationView.webContents.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Load default website in the content view
  contentView.webContents.loadURL('https://www.example.com');

  // Set up communication between the views
  setupIpcHandlers();

  // Send URL updates to navigation view
  contentView.webContents.on('did-navigate', () => {
    const currentUrl = contentView.webContents.getURL();
    navigationView.webContents.send('url-changed', currentUrl);
  });

  contentView.webContents.on('did-navigate-in-page', () => {
    const currentUrl = contentView.webContents.getURL();
    navigationView.webContents.send('url-changed', currentUrl);
  });

  // Show window when everything is loaded
  navigationView.webContents.once('did-finish-load', () => {
    mainWindow.show();
  });

  // Open DevTools for debugging if needed
  // navigationView.webContents.openDevTools();
  // contentView.webContents.openDevTools();
};

function setupIpcHandlers() {
  // Navigate to URL
  ipcMain.handle('navigate-to', async (_event, url: string) => {
    if (!contentView) return false;

    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    try {
      await contentView.webContents.loadURL(url);
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      return false;
    }
  });

  // Go back
  ipcMain.handle('go-back', () => {
    if (contentView?.webContents.navigationHistory.canGoBack()) {
      contentView.webContents.navigationHistory.goBack();
      return true;
    }
    return false;
  });

  // Go forward
  ipcMain.handle('go-forward', () => {
    if (contentView?.webContents.navigationHistory.canGoForward()) {
      contentView.webContents.navigationHistory.goForward();
      return true;
    }
    return false;
  });

  // Get current URL
  ipcMain.handle('get-current-url', () => {
    return contentView?.webContents.getURL() || '';
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
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