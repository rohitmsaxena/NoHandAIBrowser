// src/preloads/aiPreload.ts
import { contextBridge, ipcRenderer } from "electron";
import { ModelConfig } from "../services/ai/modelManager";
import { AITask, TaskResult } from "../services/ai/aiService";
import { AI_IPC_CHANNELS } from "../ipc/aiIpcHandler";

// Types that will be exposed to the renderer
type AIEventCallback = (data: any) => void;

// AI API for the renderer
const aiAPI = {
  // Model management
  getAvailableModels: (): Promise<ModelConfig[]> => {
    return ipcRenderer.invoke(AI_IPC_CHANNELS.GET_AVAILABLE_MODELS);
  },

  registerModel: (
    config: Omit<ModelConfig, "isLoaded">,
  ): Promise<ModelConfig> => {
    return ipcRenderer.invoke(AI_IPC_CHANNELS.REGISTER_MODEL, config);
  },

  loadModel: (modelId: string): Promise<boolean> => {
    return ipcRenderer.invoke(AI_IPC_CHANNELS.LOAD_MODEL, modelId);
  },

  unloadModel: (modelId: string): Promise<boolean> => {
    return ipcRenderer.invoke(AI_IPC_CHANNELS.UNLOAD_MODEL, modelId);
  },

  getLoadedModels: (): Promise<string[]> => {
    return ipcRenderer.invoke(AI_IPC_CHANNELS.GET_LOADED_MODELS);
  },

  // AI tasks
  executeTask: (task: AITask): Promise<TaskResult> => {
    return ipcRenderer.invoke(AI_IPC_CHANNELS.EXECUTE_TASK, task);
  },

  orchestrateRequest: (request: string): Promise<TaskResult[]> => {
    return ipcRenderer.invoke(AI_IPC_CHANNELS.ORCHESTRATE_REQUEST, request);
  },

  cancelTask: (): Promise<boolean> => {
    return ipcRenderer.invoke(AI_IPC_CHANNELS.CANCEL_TASK);
  },

  // Event listeners
  onModelLoaded: (callback: (modelId: string) => void): void => {
    ipcRenderer.removeAllListeners(AI_IPC_CHANNELS.MODEL_LOADED);
    ipcRenderer.on(AI_IPC_CHANNELS.MODEL_LOADED, (_event, modelId) =>
      callback(modelId),
    );
  },

  onModelUnloaded: (callback: (modelId: string) => void): void => {
    ipcRenderer.removeAllListeners(AI_IPC_CHANNELS.MODEL_UNLOADED);
    ipcRenderer.on(AI_IPC_CHANNELS.MODEL_UNLOADED, (_event, modelId) =>
      callback(modelId),
    );
  },

  onTaskProgress: (callback: AIEventCallback): void => {
    ipcRenderer.removeAllListeners(AI_IPC_CHANNELS.TASK_PROGRESS);
    ipcRenderer.on(AI_IPC_CHANNELS.TASK_PROGRESS, (_event, data) =>
      callback(data),
    );
  },

  onTaskCompleted: (callback: AIEventCallback): void => {
    ipcRenderer.removeAllListeners(AI_IPC_CHANNELS.TASK_COMPLETED);
    ipcRenderer.on(AI_IPC_CHANNELS.TASK_COMPLETED, (_event, data) =>
      callback(data),
    );
  },

  onTaskError: (callback: AIEventCallback): void => {
    ipcRenderer.removeAllListeners(AI_IPC_CHANNELS.TASK_ERROR);
    ipcRenderer.on(AI_IPC_CHANNELS.TASK_ERROR, (_event, data) =>
      callback(data),
    );
  },

  // Cleanup
  removeAllListeners: (): void => {
    ipcRenderer.removeAllListeners(AI_IPC_CHANNELS.MODEL_LOADED);
    ipcRenderer.removeAllListeners(AI_IPC_CHANNELS.MODEL_UNLOADED);
    ipcRenderer.removeAllListeners(AI_IPC_CHANNELS.TASK_PROGRESS);
    ipcRenderer.removeAllListeners(AI_IPC_CHANNELS.TASK_COMPLETED);
    ipcRenderer.removeAllListeners(AI_IPC_CHANNELS.TASK_ERROR);
  },
};

// Expose the AI API to the renderer process
contextBridge.exposeInMainWorld("aiAPI", aiAPI);

// Define types for TypeScript support in the renderer
declare global {
  interface Window {
    aiAPI: typeof aiAPI;
  }
}
