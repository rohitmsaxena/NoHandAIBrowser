// src/ipc/aiIpcHandler.ts
import { ipcMain, IpcMainInvokeEvent } from "electron";
import { ModelConfig, modelManager } from "../services/ai/modelManager";
import { aiService, AITask, TaskResult } from "../services/ai/aiService";
import { windowManager } from "../managers/windowManager";

// Define all AI-related IPC channels
const AI_IPC_CHANNELS = {
  // Model management
  GET_AVAILABLE_MODELS: "get-available-models",
  REGISTER_MODEL: "register-model",
  LOAD_MODEL: "load-model",
  UNLOAD_MODEL: "unload-model",
  GET_LOADED_MODELS: "get-loaded-models",

  // AI tasks
  EXECUTE_TASK: "execute-ai-task",
  ORCHESTRATE_REQUEST: "orchestrate-ai-request",
  CANCEL_TASK: "cancel-ai-task",

  // Events
  MODEL_LOADED: "model-loaded",
  MODEL_UNLOADED: "model-unloaded",
  TASK_PROGRESS: "ai-task-progress",
  TASK_COMPLETED: "ai-task-completed",
  TASK_ERROR: "ai-task-error",
};

export class AIIpcHandler {
  // Set up all AI-related IPC handlers
  setupHandlers(): void {
    // Model management handlers
    this.setupModelManagementHandlers();

    // AI task handlers
    this.setupTaskHandlers();
  }

  // Set up model management handlers
  private setupModelManagementHandlers(): void {
    // Get all available models
    ipcMain.handle(
      AI_IPC_CHANNELS.GET_AVAILABLE_MODELS,
      async (): Promise<ModelConfig[]> => {
        return modelManager.getAvailableModels();
      },
    );

    // Register a new model
    ipcMain.handle(
      AI_IPC_CHANNELS.REGISTER_MODEL,
      async (
        _event: IpcMainInvokeEvent,
        config: Omit<ModelConfig, "isLoaded">,
      ): Promise<ModelConfig> => {
        return modelManager.registerModel(config);
      },
    );

    // Load a model
    ipcMain.handle(
      AI_IPC_CHANNELS.LOAD_MODEL,
      async (_event: IpcMainInvokeEvent, modelId: string): Promise<boolean> => {
        const success = await modelManager.loadModel(modelId);

        if (success) {
          this.notifyAllViews(AI_IPC_CHANNELS.MODEL_LOADED, modelId);
        }

        return success;
      },
    );

    // Unload a model
    ipcMain.handle(
      AI_IPC_CHANNELS.UNLOAD_MODEL,
      async (_event: IpcMainInvokeEvent, modelId: string): Promise<boolean> => {
        const success = await modelManager.unloadModel(modelId);

        if (success) {
          this.notifyAllViews(AI_IPC_CHANNELS.MODEL_UNLOADED, modelId);
        }

        return success;
      },
    );

    // Get all loaded models
    ipcMain.handle(
      AI_IPC_CHANNELS.GET_LOADED_MODELS,
      async (): Promise<string[]> => {
        return modelManager
          .getAvailableModels()
          .filter((model) => model.isLoaded)
          .map((model) => model.id);
      },
    );
  }

  // Set up AI task handlers
  private setupTaskHandlers(): void {
    // Execute a specific AI task
    ipcMain.handle(
      AI_IPC_CHANNELS.EXECUTE_TASK,
      async (_event: IpcMainInvokeEvent, task: AITask): Promise<TaskResult> => {
        // For streaming tasks, set up a listener for progress updates
        if (task.type === "chat" || task.type === "completion") {
          return new Promise((resolve) => {
            aiService
              .executeTask(task)
              .then((result) => {
                this.notifyAllViews(AI_IPC_CHANNELS.TASK_COMPLETED, {
                  taskType: task.type,
                  result,
                });
                resolve(result);
              })
              .catch((error) => {
                const errorResult: TaskResult = {
                  success: false,
                  error: error.message || "Unknown error in task execution",
                };
                this.notifyAllViews(AI_IPC_CHANNELS.TASK_ERROR, {
                  taskType: task.type,
                  error: errorResult,
                });
                resolve(errorResult);
              });
          });
        } else {
          // For non-streaming tasks, just execute and return
          return aiService.executeTask(task);
        }
      },
    );

    // Orchestrate a complex AI request
    ipcMain.handle(
      AI_IPC_CHANNELS.ORCHESTRATE_REQUEST,
      async (
        _event: IpcMainInvokeEvent,
        request: string,
      ): Promise<TaskResult[]> => {
        try {
          const results = await aiService.orchestrateRequest(request);
          return results;
        } catch (error: any) {
          return [
            {
              success: false,
              error: error.message || "Unknown error in request orchestration",
            },
          ];
        }
      },
    );

    // Cancel an ongoing AI task
    ipcMain.handle(AI_IPC_CHANNELS.CANCEL_TASK, async (): Promise<boolean> => {
      // To be implemented when we add task cancellation support
      return false;
    });
  }

  // Helper method to notify all views about an event
  private notifyAllViews(channel: string, data: any): void {
    const views = [
      windowManager.getNavigationView(),
      windowManager.getTabsView(),
      windowManager.getSidebarView(),
    ];

    for (const view of views) {
      if (view) {
        view.webContents.send(channel, data);
      }
    }
  }
}

// Export a singleton instance
export const aiIpcHandler = new AIIpcHandler();

// Export channels for use in other modules
export { AI_IPC_CHANNELS };
