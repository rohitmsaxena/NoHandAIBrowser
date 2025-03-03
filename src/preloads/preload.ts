import { contextBridge, ipcRenderer } from 'electron';

// Tab information type
interface TabInfo {
    id: string;
    url: string;
    title: string;
    isActive: boolean;
}

// Expose protected methods for navigation control
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

    onLoadingChange: (callback: (isLoading: boolean) => void) => {
        // Remove any existing listeners to avoid duplicates
        ipcRenderer.removeAllListeners('loading-changed');
        // Add the new listener
        ipcRenderer.on('loading-changed', (_event, isLoading) => callback(isLoading));
    },

    // Tab functions directly accessible from the navigation bar
    createTab: (url?: string) => ipcRenderer.invoke('create-tab', url),

    // Cleanup functions
    removeListeners: () => {
        ipcRenderer.removeAllListeners('url-changed');
        ipcRenderer.removeAllListeners('loading-changed');
    }
});

// // Expose protected methods for tab management
// contextBridge.exposeInMainWorld('tabsAPI', {
//     // Tab management
//     createTab: (url?: string) => ipcRenderer.invoke('create-tab', url),
//     closeTab: (tabId: string) => ipcRenderer.invoke('close-tab', tabId),
//     switchTab: (tabId: string) => ipcRenderer.invoke('switch-tab', tabId),
//     getTabs: () => ipcRenderer.invoke('get-tabs'),
//
//     // Listen for tab updates
//     onTabsUpdated: (callback: (tabs: TabInfo[]) => void) => {
//         // Remove any existing listeners to avoid duplicates
//         ipcRenderer.removeAllListeners('tabs-updated');
//         // Add the new listener
//         ipcRenderer.on('tabs-updated', (_event, tabs) => callback(tabs));
//     },
//
//     // Remove listeners (for cleanup)
//     removeTabsUpdatedListener: () => {
//         ipcRenderer.removeAllListeners('tabs-updated');
//     }
// });