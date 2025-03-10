import { contextBridge, ipcRenderer } from "electron";
import { createRendererSideBirpc } from "../utils/birpcUtils";

// Import types directly from proper locations
import type {
  ChatMessage,
  MainFunctions,
  RendererFunctions,
} from "../managers/BirpcManager";
import type { LlmState } from "../managers/llmManager";

// Define the renderer functions that can be called by the main process
const rendererFunctions: RendererFunctions = {
  onSidebarStateChanged: (isExpanded) => {
    // This function will be overridden by the UI
    console.log("Sidebar state changed (default handler):", isExpanded);
  },
  onChatMessageReceived: (message) => {
    // This function will be overridden by the UI
    console.log("Chat message received (default handler):", message);
  },
  onLlmStateChanged: (state) => {
    // This function will be overridden by the UI
    console.log("LLM state changed (default handler):", state);
  },
};

// Create the birpc client
const rpc = createRendererSideBirpc<MainFunctions, RendererFunctions>(
  "sidebar-rpc",
  ipcRenderer,
  rendererFunctions,
);

// Create an event emitter-like interface for the renderer functions
const events = {
  sidebarState: new Set<(isExpanded: boolean) => void>(),
  chatMessage: new Set<(message: ChatMessage) => void>(),
  llmState: new Set<(state: LlmState) => void>(),
};

// Override the default handlers to emit events
rendererFunctions.onSidebarStateChanged = (isExpanded) => {
  events.sidebarState.forEach((cb) => cb(isExpanded));
};

rendererFunctions.onChatMessageReceived = (message) => {
  events.chatMessage.forEach((cb) => cb(message));
};

rendererFunctions.onLlmStateChanged = (state) => {
  events.llmState.forEach((cb) => cb(state));
};

// Expose the birpc API to the renderer
contextBridge.exposeInMainWorld("sidebarBirpcAPI", {
  // Sidebar functions
  toggleSidebar: () => rpc.toggleSidebar(),
  getSidebarState: () => rpc.getSidebarState(),

  // Chat functions
  sendChatMessage: (message: string) => rpc.sendChatMessage(message),
  stopChatGeneration: () => rpc.stopChatGeneration(),
  getChatMessages: () => rpc.getChatMessages(),

  // LLM functions
  selectModelFile: () => rpc.selectModelFile(),
  getLlmState: () => rpc.getLlmState(),

  // Event handlers
  onSidebarStateChanged: (callback: (isExpanded: boolean) => void) => {
    events.sidebarState.add(callback);
    return () => {
      events.sidebarState.delete(callback);
    };
  },
  onChatMessageReceived: (callback: (message: ChatMessage) => void) => {
    events.chatMessage.add(callback);
    return () => {
      events.chatMessage.delete(callback);
    };
  },
  onLlmStateChanged: (callback: (state: LlmState) => void) => {
    events.llmState.add(callback);
    return () => {
      events.llmState.delete(callback);
    };
  },
});
