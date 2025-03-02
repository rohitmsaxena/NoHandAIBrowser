import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Define TypeScript interface for the electron API
interface ElectronAPI {
    navigateTo: (url: string) => Promise<boolean>;
    goBack: () => Promise<boolean>;
    goForward: () => Promise<boolean>;
    getCurrentUrl: () => Promise<string>;
    onUrlChange: (callback: (url: string) => void) => void;
}

// Add type declaration for the window.electronAPI
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

const App: React.FC = () => {
    const [url, setUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const urlInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Get initial URL
        window.electronAPI.getCurrentUrl().then(setUrl);

        // Listen for URL changes
        window.electronAPI.onUrlChange((newUrl) => {
            setUrl(newUrl);
            setIsLoading(false);
        });
    }, []);

    const handleNavigate = async () => {
        if (!url.trim()) return;

        setIsLoading(true);
        await window.electronAPI.navigateTo(url);
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

    return (
        <div className="browser-container">
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
            {/* WebContentsView is rendered in the main process */}
            <div className="browser-content"></div>
        </div>
    );
};

export default App;