import { app, BrowserWindow, WebContentsView, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow;
let webContentView: WebContentsView

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  // Create the webContentView for browsing
  webContentView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    }
  });

  // Set initial browser view position (below header)
  if (mainWindow) {
    const contentBounds = mainWindow.getContentBounds();
    const headerHeight = 70; // Height for our browser controls
    webContentView.setBounds({
      x: 0,
      y: headerHeight,
      width: contentBounds.width,
      height: contentBounds.height - headerHeight
    });
    mainWindow.setContentView(webContentView);

// Updated code:
    mainWindow.on('resize', () => {
      const newBounds = mainWindow?.getContentBounds();
      if (newBounds && webContentView) {
        webContentView.setBounds({
          x: 0,
          y: headerHeight,
          width: newBounds.width,
          height: newBounds.height - headerHeight
        });
        // Ensure content view is properly set after resize
        mainWindow?.setContentView(webContentView);
      }
    });
  }

  // Load default URL in the web contents view
  webContentView.webContents.loadURL('https://www.example.com');

  // Send URL updates to renderer
  webContentView.webContents.on('did-navigate', () => {
    const currentUrl = webContentView?.webContents.getURL();
    mainWindow?.webContents.send('url-changed', currentUrl);
  });

  webContentView.webContents.on('did-navigate-in-page', () => {
    const currentUrl = webContentView?.webContents.getURL();
    mainWindow?.webContents.send('url-changed', currentUrl);
  });


  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
  setupIPCHandlers();
};

function setupIPCHandlers() {
  // Navigate to URL
  ipcMain.handle('navigate-to', async (_event, url: string) => {
    if (!webContentView) return false;

    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    try {
      await webContentView.webContents.loadURL(url);
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      return false;
    }
  });

  // Go back
  ipcMain.handle('go-back', () => {
    if (webContentView?.webContents.canGoBack()) {
      webContentView.webContents.goBack();
      return true;
    }
    return false;
  });

  // Go forward
  ipcMain.handle('go-forward', () => {
    if (webContentView?.webContents.canGoForward()) {
      webContentView.webContents.goForward();
      return true;
    }
    return false;
  });

  // Get current URL
  ipcMain.handle('get-current-url', () => {
    return webContentView?.webContents.getURL() || '';
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
