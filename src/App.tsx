import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import TabsBar from './TabsBar';

// Define TypeScript interface for the electron API
interface ElectronAPI {
    navigateTo: (url: string) => Promise<boolean>;
    goBack: () => Promise<boolean>;
    goForward: () => Promise<boolean>;
    getCurrentUrl: () => Promise<string>;
    onUrlChange: (callback: (url: string) => void) => void;
    onLoadingChange: (callback: (isLoading: boolean) => void) => void;
    removeListeners: () => void;
    createTab: (url?: string) => Promise<string>;
}

// Add type declaration for the window.electronAPI
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

const App: React.FC = () => {
    // Determine which view to render based on URL hash
    const viewType = window.location.hash.slice(1) || 'navigation';

    // Add console logging to debug rendering
    console.log('Rendering view:', viewType);

    // Render the appropriate component based on view type
    return (
        <div className="app-container">
            {viewType === 'tabs' && <TabsBar />}
            {viewType === 'navigation' && <NavigationBar />}
        </div>
    );
};

// Navigation component
const NavigationBar: React.FC = () => {
    const [url, setUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const urlInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        console.log('NavigationBar component mounted');

        // Get initial URL
        window.electronAPI.getCurrentUrl().then(currentUrl => {
            console.log('Initial URL:', currentUrl);
            setUrl(currentUrl);
        });

        // Listen for URL changes
        window.electronAPI.onUrlChange((newUrl) => {
            console.log('URL changed:', newUrl);
            setUrl(newUrl);
        });

        // Listen for loading state changes
        window.electronAPI.onLoadingChange((loading) => {
            console.log('Loading state changed:', loading);
            setIsLoading(loading);
        });

        // Cleanup on unmount
        return () => {
            window.electronAPI.removeListeners();
        };
    }, []);

    const handleNavigate = async () => {
        if (!url.trim()) return;

        // Properly format URL if needed
        let formattedUrl = url;
        if (!/^https?:\/\//i.test(formattedUrl)) {
            formattedUrl = 'https://' + formattedUrl;
        }

        await window.electronAPI.navigateTo(formattedUrl);
    };

    const handleGoBack = async () => {
        await window.electronAPI.goBack();
    };

    const handleGoForward = async () => {
        await window.electronAPI.goForward();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleNavigate();
        }
    };

    const handleNewTab = async () => {
        await window.electronAPI.createTab();
    };

    return (
        <div className="navigation-container">
            <div className="browser-toolbar">
                <div className="nav-buttons">
                    <button
                        onClick={handleGoBack}
                        className="nav-button"
                        title="Go back"
                    >
                        &#8592;
                    </button>
                    <button
                        onClick={handleGoForward}
                        className="nav-button"
                        title="Go forward"
                    >
                        &#8594;
                    </button>
                    <button
                        onClick={handleNewTab}
                        className="nav-button"
                        title="New tab"
                    >
                        +
                    </button>
                </div>

                <div className="url-bar-container">
                    <input
                        ref={urlInputRef}
                        type="text"
                        className="url-input"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter URL..."
                    />
                    {isLoading && <div className="loading-indicator">Loading...</div>}
                </div>

                <button
                    onClick={handleNavigate}
                    className="go-button"
                >
                    Go
                </button>
            </div>
        </div>
    );
};

export default App;