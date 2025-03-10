import { ipcMain, IpcRenderer, WebContents } from "electron";
import { createBirpc } from "birpc";

/**
 * Create a birpc instance on the main process side
 */
export function createMainSideBirpc<
  RendererFunctions extends Record<string, any> = Record<string, never>,
  MainFunctions extends Record<string, any> = Record<string, never>,
>(channel: string, window: WebContents, mainFunctions: MainFunctions) {
  return createBirpc<RendererFunctions, MainFunctions>(mainFunctions, {
    post: (data) => {
      if (window) {
        window.send(channel, data);
      }
    },
    on: (listener) => {
      const handler = (_event: any, data: any) => {
        listener(data);
      };
      ipcMain.on(channel, handler);
      return () => {
        ipcMain.removeListener(channel, handler);
      };
    },
    serialize: (data) => JSON.stringify(data),
    deserialize: (message) => JSON.parse(message),
  });
}

/**
 * Create a birpc instance on the renderer process side
 */
export function createRendererSideBirpc<
  MainFunctions extends Record<string, any> = Record<string, never>,
  RendererFunctions extends Record<string, any> = Record<string, never>,
>(
  channel: string,
  ipcRenderer: IpcRenderer,
  rendererFunctions: RendererFunctions,
) {
  return createBirpc<MainFunctions, RendererFunctions>(rendererFunctions, {
    post: (data) => {
      ipcRenderer.send(channel, data);
    },
    on: (listener) => {
      const handler = (_event: any, data: any) => {
        listener(data);
      };
      ipcRenderer.on(channel, handler);
      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    },
    serialize: (data) => JSON.stringify(data),
    deserialize: (message) => JSON.parse(message),
  });
}
