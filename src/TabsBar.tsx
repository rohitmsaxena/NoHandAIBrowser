import React, { useState, useEffect } from 'react';
import './TabsBar.css';

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

    // Immediate visual feedback for debugging
    console.log('TabsBar component rendering');

    useEffect(() => {
        console.log('TabsBar component mounted');

        // Get initial tabs
        if (window.tabsAPI) {
            window.tabsAPI.getTabs().then(initialTabs => {
                console.log('Initial tabs:', initialTabs);
                setTabs(initialTabs);
            }).catch(err => {
                console.error('Error getting initial tabs:', err);
            });

            // Listen for tab updates
            window.tabsAPI.onTabsUpdated((updatedTabs) => {
                console.log('Tabs updated:', updatedTabs);
                setTabs(updatedTabs);
            });

            // Cleanup on unmount
            return () => {
                console.log('TabsBar component unmounting');
                window.tabsAPI.removeTabsUpdatedListener();
            };
        } else {
            console.error('tabsAPI not available in window object');
        }
    }, []);

    // Show a simple default UI if tabsAPI is not available or there are no tabs
    if (!window.tabsAPI || tabs.length === 0) {
        return (
            <div className="tabs-bar" style={{ background: '#e9e9e9', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                    onClick={() => window.tabsAPI?.createTab()}
                    style={{ padding: '5px 10px', cursor: 'pointer' }}
                >
                    New Tab
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
                        className={`tab ${tab.isActive ? 'active' : ''}`}
                        onClick={() => handleTabClick(tab.id)}
                        title={tab.url}
                    >
                        <span className="tab-title">{tab.title || 'New Tab'}</span>
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
            <button
                className="new-tab-button"
                onClick={handleNewTab}
                title="New tab"
            >
                +
            </button>
        </div>
    );
};

export default TabsBar;