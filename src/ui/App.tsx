import React from "react";
import "./App.css";
import TabsBar from "./TabsBar";
import { ElectronAPI } from "./interfaces/ElectronAPI";
import NavigationBar from "./NavigationBar";

// Add type declaration for the window.electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
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
    </div>
  );
};
export default App;
