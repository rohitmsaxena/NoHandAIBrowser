import React, { useEffect, useRef, useState } from "react";
import "./Sidebar.css";

// Chat message interface
interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: number;
}

const Sidebar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [apiAvailable, setApiAvailable] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Log for debugging
  console.log("Sidebar component rendering");
  console.log("Window object keys:", Object.keys(window));
  console.log("SidebarAPI available:", window.sidebarAPI !== undefined);

  useEffect(() => {
    console.log("Sidebar component mounted");

    // Check if sidebarAPI is available
    if (window.sidebarAPI) {
      setApiAvailable(true);

      // Get initial sidebar state
      window.sidebarAPI
        .getSidebarState()
        .then((initialState) => {
          console.log("Initial sidebar state:", initialState);
          setIsExpanded(initialState);
        })
        .catch((err) => {
          console.error("Error getting sidebar state:", err);
          setErrorMessage("Error loading sidebar state: " + err.message);
        });

      // Listen for sidebar state changes
      window.sidebarAPI.onSidebarStateChanged((newState) => {
        console.log("Sidebar state changed:", newState);
        setIsExpanded(newState);
      });

      // Listen for new chat messages
      window.sidebarAPI.onChatMessageReceived((message) => {
        console.log("New chat message:", message);
        setMessages((prevMessages) => [...prevMessages, message]);

        // Scroll to bottom on new message
        setTimeout(scrollToBottom, 100);
      });

      // Cleanup on unmount
      return () => {
        console.log("Sidebar component unmounting");
        window.sidebarAPI.removeListeners();
      };
    } else {
      console.error("sidebarAPI not available in window object");
      setApiAvailable(false);
      setErrorMessage("Sidebar API not available - check preload script");
    }
  }, []);

  // Effect to scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle toggle sidebar
  const handleToggleSidebar = () => {
    if (window.sidebarAPI) {
      window.sidebarAPI
        .toggleSidebar()
        .then((newState) => {
          console.log("Toggled sidebar state:", newState);
        })
        .catch((err) => {
          console.error("Error toggling sidebar:", err);
        });
    }
  };

  // Handle sending a message
  const handleSendMessage = () => {
    if (!inputValue.trim() || !window.sidebarAPI) return;

    window.sidebarAPI
      .sendChatMessage(inputValue.trim())
      .then(() => {
        // Clear input after sending
        setInputValue("");
      })
      .catch((err) => {
        console.error("Error sending message:", err);
        setErrorMessage("Error sending message: " + err.message);
      });
  };

  // Handle input key press (send on Enter)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Show a simple error UI if sidebarAPI is not available
  if (!apiAvailable) {
    return (
      <div className="sidebar sidebar-error">
        <div className="sidebar-error-message">
          {errorMessage || "Sidebar API not available"}
        </div>
        <div className="sidebar-api-info">
          Available window APIs:{" "}
          {Object.keys(window)
            .filter((key) => key.includes("API"))
            .join(", ")}
        </div>
      </div>
    );
  }

  return (
    <div className={`sidebar ${isExpanded ? "expanded" : "collapsed"}`}>
      {/* Sidebar toggle button */}
      <button
        className="sidebar-toggle"
        onClick={handleToggleSidebar}
        title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isExpanded ? "→" : "←"}
      </button>

      {/* Sidebar content (only shown when expanded) */}
      {isExpanded && (
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h2>AI Assistant</h2>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <p>Send a message to start chatting with the AI assistant.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message ${message.sender === "user" ? "user-message" : "ai-message"}`}
                >
                  <div className="message-content">{message.content}</div>
                  <div className="message-timestamp">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
            />
            <button
              className="send-button"
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
