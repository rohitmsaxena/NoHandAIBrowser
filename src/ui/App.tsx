import React from "react";
import "./App.css";
import TabsBar from "./TabsBar";
import { ElectronAPI } from "./interfaces/ElectronAPI";
import NavigationBar from "./NavigationBar";
import Sidebar from "./Sidebar";

// LLM State interface
interface LlmState {
  llama: {
    loaded: boolean;
    error?: string;
  };
  selectedModelFilePath?: string;
  model: {
    loaded: boolean;
    loading: boolean;
    loadProgress?: number;
    name?: string;
    error?: string;
  };
  context: {
    loaded: boolean;
    error?: string;
  };
  contextSequence: {
    loaded: boolean;
    error?: string;
  };
  chatSession: {
    loaded: boolean;
    generating: boolean;
    error?: string;
  };
}

// Chat message interface
interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "ai" | "system";
  timestamp: number;
  streaming?: boolean;
}

// Add type declaration for the window.electronAPI and window.sidebarAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    sidebarAPI: {
      toggleSidebar: () => Promise<boolean>;
      getSidebarState: () => Promise<boolean>;
      onSidebarStateChanged: (callback: (isExpanded: boolean) => void) => void;
      sendChatMessage: (message: string) => Promise<ChatMessage>;
      stopChatGeneration: () => Promise<void>;
      selectModelFile: () => Promise<boolean>;
      getLlmState: () => Promise<LlmState>;
      onLlmStateChanged: (callback: (state: LlmState) => void) => void;
      onChatMessageReceived: (callback: (message: ChatMessage) => void) => void;
      removeListeners: () => void;
    };
    // tabsAPI is declared in TabsBar.tsx
  }
}

const App: React.FC = () => {
  // Determine which view to render based on URL hash
  const viewType = window.location.hash.slice(1) || "navigation";

  // Add console logging to debug rendering
  console.log("Rendering view:", viewType);

  // Render the appropriate component based on view type
  return (
    <div className="app-container">
      {viewType === "tabs" && <TabsBar />}
      {viewType === "navigation" && <NavigationBar />}
      {viewType === "sidebar" && <Sidebar />}
    </div>
  );
};
export default App;
