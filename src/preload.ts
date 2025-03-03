import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Navigation functions
    navigateTo: (url: string) => ipcRenderer.invoke('navigate-to', url),
    goBack: () => ipcRenderer.invoke('go-back'),
    goForward: () => ipcRenderer.invoke('go-forward'),
    getCurrentUrl: () => ipcRenderer.invoke('get-current-url'),

    // Event listeners
    onUrlChange: (callback: (url: string) => void) => {
        // Remove any existing listeners to avoid duplicates
        ipcRenderer.removeAllListeners('url-changed');
        // Add the new listener
        ipcRenderer.on('url-changed', (_event, url) => callback(url));
    },

    // Additional helper to remove listeners when component unmounts
    removeUrlChangeListener: () => {
        ipcRenderer.removeAllListeners('url-changed');
    }
});