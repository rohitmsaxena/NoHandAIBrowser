import React, {useEffect, useRef, useState} from "react";

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
                {isLoading && <div className="loading-indicator">Loading...</div>}

                <div className="url-bar-container">
                    <input
                        ref={urlInputRef}
                        type="text"
                        className="url-input"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDownCapture={handleKeyPress}
                        placeholder="Enter URL..."
                    />
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

export default NavigationBar