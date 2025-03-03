// Application-wide constants

// UI dimensions
export const TAB_BAR_HEIGHT = 35; // Height for tab bar
export const NAVIGATION_HEIGHT = 50; // Height for navigation controls
export const HEADER_HEIGHT = TAB_BAR_HEIGHT + NAVIGATION_HEIGHT; // Combined height

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
};
