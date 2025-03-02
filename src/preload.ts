import { contextBridge, ipcRenderer } from 'electron';

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
contextBridge.exposeInMainWorld('electronAPI', {
    navigateTo: (url: string) => ipcRenderer.invoke('navigate-to', url),
    goBack: () => ipcRenderer.invoke('go-back'),
    goForward: () => ipcRenderer.invoke('go-forward'),
    getCurrentUrl: () => ipcRenderer.invoke('get-current-url'),
    onUrlChange: (callback: (url: string) => void) =>
        ipcRenderer.on('url-changed', (_event, url) => callback(url)),
});