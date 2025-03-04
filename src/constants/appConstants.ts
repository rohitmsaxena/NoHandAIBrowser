// Application-wide constants

// UI dimensions
export const TAB_BAR_HEIGHT = 35; // Height for tab bar
export const NAVIGATION_HEIGHT = 50; // Height for navigation controls
export const HEADER_HEIGHT = TAB_BAR_HEIGHT + NAVIGATION_HEIGHT; // Combined height

// Sidebar dimensions
export const SIDEBAR_COLLAPSED_WIDTH = 40; // Width of sidebar when collapsed
export const SIDEBAR_EXPANDED_WIDTH = 350; // Width of sidebar when expanded
export const SIDEBAR_DEFAULT_STATE = false; // Default to collapsed (false = collapsed, true = expanded)

// Default URLs
export const DEFAULT_URL = "https://www.google.com";

// Channel names for IPC communication
export const IPC_CHANNELS = {
  // Tab management
  CREATE_TAB: "create-tab",
  CLOSE_TAB: "close-tab",
  SWITCH_TAB: "switch-tab",
  GET_TABS: "get-tabs",
  TABS_UPDATED: "tabs-updated",

  // Navigation
  NAVIGATE_TO: "navigate-to",
  GO_BACK: "go-back",
  GO_FORWARD: "go-forward",
  GET_CURRENT_URL: "get-current-url",
  URL_CHANGED: "url-changed",
  LOADING_CHANGED: "loading-changed",

  // Sidebar
  TOGGLE_SIDEBAR: "toggle-sidebar",
  GET_SIDEBAR_STATE: "get-sidebar-state",
  SIDEBAR_STATE_CHANGED: "sidebar-state-changed",

  // AI Chat
  SEND_CHAT_MESSAGE: "send-chat-message",
  CHAT_MESSAGE_RECEIVED: "chat-message-received",

  // File operations
  SELECT_MODEL_FILE: "select-model-file",
};
