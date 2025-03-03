import React, { useState, useEffect } from "react";
import "./TabsBar.css";

// Tab information type
interface TabInfo {
  id: string;
  url: string;
  title: string;
  isActive: boolean;
}

// Add type declaration for the window.tabsAPI
declare global {
  interface Window {
    tabsAPI: {
      createTab: (url?: string) => Promise<string>;
      closeTab: (tabId: string) => Promise<boolean>;
      switchTab: (tabId: string) => Promise<boolean>;
      getTabs: () => Promise<TabInfo[]>;
      onTabsUpdated: (callback: (tabs: TabInfo[]) => void) => void;
      removeTabsUpdatedListener: () => void;
    };
  }
}

const TabsBar: React.FC = () => {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [apiAvailable, setApiAvailable] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Immediate visual feedback for debugging
  console.log("TabsBar component rendering");
  console.log("Window object keys:", Object.keys(window));
  console.log("TabsAPI available:", window.tabsAPI !== undefined);

  useEffect(() => {
    console.log("TabsBar component mounted");

    // Check if tabsAPI is available
    if (window.tabsAPI) {
      setApiAvailable(true);

      // Get initial tabs
      window.tabsAPI
        .getTabs()
        .then((initialTabs) => {
          console.log("Initial tabs:", initialTabs);
          setTabs(initialTabs);
        })
        .catch((err) => {
          console.error("Error getting initial tabs:", err);
          setErrorMessage("Error loading tabs: " + err.message);
        });

      // Listen for tab updates
      window.tabsAPI.onTabsUpdated((updatedTabs) => {
        console.log("Tabs updated:", updatedTabs);
        setTabs(updatedTabs);
      });

      // Cleanup on unmount
      return () => {
        console.log("TabsBar component unmounting");
        window.tabsAPI.removeTabsUpdatedListener();
      };
    } else {
      console.error("tabsAPI not available in window object");
      setApiAvailable(false);
      setErrorMessage("Tabs API not available - check preload script");
    }
  }, []);

  // Show a simple default UI if tabsAPI is not available
  if (!apiAvailable) {
    return (
      <div
        className="tabs-bar"
        style={{
          background: "#e9e9e9",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <div style={{ color: "red", marginBottom: "10px" }}>
          {errorMessage || "Tabs API not available"}
        </div>
        <div>
          Available window APIs:{" "}
          {Object.keys(window)
            .filter((key) => key.includes("API"))
            .join(", ")}
        </div>
      </div>
    );
  }

  // Show a loading state while we're waiting for tabs
  if (tabs.length === 0) {
    return (
      <div
        className="tabs-bar"
        style={{
          background: "#e9e9e9",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => window.tabsAPI.createTab()}
          style={{ padding: "5px 10px", cursor: "pointer" }}
        >
          Create First Tab
        </button>
      </div>
    );
  }

  const handleTabClick = (tabId: string) => {
    window.tabsAPI.switchTab(tabId);
  };

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation(); // Prevent triggering tab switch
    window.tabsAPI.closeTab(tabId);
  };

  const handleNewTab = () => {
    window.tabsAPI.createTab();
  };

  return (
    <div className="tabs-bar">
      <div className="tabs-container">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${tab.isActive ? "active" : ""}`}
            onClick={() => handleTabClick(tab.id)}
            title={tab.url}
          >
            <span className="tab-title">{tab.title || "New Tab"}</span>
            <button
              className="tab-close"
              onClick={(e) => handleTabClose(e, tab.id)}
              title="Close tab"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="new-tab-button" onClick={handleNewTab} title="New tab">
        +
      </button>
    </div>
  );
};

export default TabsBar;
