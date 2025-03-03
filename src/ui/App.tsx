import React from "react";
import "./App.css";
import TabsBar from "./TabsBar";
import { ElectronAPI } from "./interfaces/ElectronAPI";
import NavigationBar from "./NavigationBar";
import Sidebar from "./Sidebar";

// Add type declaration for the window.electronAPI and window.sidebarAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    sidebarAPI: {
      toggleSidebar: () => Promise<boolean>;
      getSidebarState: () => Promise<boolean>;
      onSidebarStateChanged: (callback: (isExpanded: boolean) => void) => void;
      sendChatMessage: (message: string) => Promise<any>;
      onChatMessageReceived: (callback: (message: any) => void) => void;
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
