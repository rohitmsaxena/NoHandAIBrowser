import { app, BaseWindow } from 'electron';
import started from 'electron-squirrel-startup';
import { windowManager } from './managers/windowManager';
import { tabManager } from './managers/tabManager';
import { ipcHandler } from './ipc/ipcHandler';
import { DEFAULT_URL } from './constants/appConstants';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Create the main window
  await windowManager.createWindow();

  // Setup IPC handlers
  ipcHandler.setupHandlers();

  // Create an initial tab
  tabManager.createTab(DEFAULT_URL);
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  // On macOS, re-create a window when the dock icon is clicked and no other windows are open
  if (BaseWindow.getAllWindows().length === 0) {
    await windowManager.createWindow();
    tabManager.createTab(DEFAULT_URL);
  }
});