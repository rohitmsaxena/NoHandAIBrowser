"use strict";
const electron = require("electron");
const module$1 = require("module");
const path = require("node:path");
const node_events = require("node:events");
const node_url = require("node:url");
const nodeLlamaCpp = require("node-llama-cpp");
const birpc = require("birpc");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const require$1 = module$1.createRequire(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href);
const startupHandler = require$1("electron-squirrel-startup");
const TAB_BAR_HEIGHT = 35;
const NAVIGATION_HEIGHT = 50;
const HEADER_HEIGHT = TAB_BAR_HEIGHT + NAVIGATION_HEIGHT;
const SIDEBAR_COLLAPSED_WIDTH = 40;
const SIDEBAR_EXPANDED_WIDTH = 350;
const SIDEBAR_DEFAULT_STATE = false;
const DEFAULT_URL = "https://www.google.com";
const IPC_CHANNELS = {
  // Tab management
  CREATE_TAB: "create-tab",
  CLOSE_TAB: "close-tab",
  SWITCH_TAB: "switch-tab",
  GET_TABS: "get-tabs",
  // Navigation
  NAVIGATE_TO: "navigate-to",
  GO_BACK: "go-back",
  GO_FORWARD: "go-forward",
  GET_CURRENT_URL: "get-current-url",
  // Sidebar
  TOGGLE_SIDEBAR: "toggle-sidebar",
  GET_SIDEBAR_STATE: "get-sidebar-state",
  // AI Chat
  SEND_CHAT_MESSAGE: "send-chat-message",
  STOP_CHAT_GENERATION: "stop-chat-generation",
  // LLM Management
  SELECT_MODEL_FILE: "select-model-file",
  GET_LLM_STATE: "get-llm-state",
  LLM_STATE_CHANGED: "llm-state-changed"
};
class TabManager {
  tabs = [];
  activeTabId = null;
  // Create a new tab with a given URL
  createTab(url = DEFAULT_URL) {
    const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const contentView = new electron.WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });
    const contentBounds = windowManager.getContentBounds();
    const isSidebarExpanded = windowManager.getSidebarState();
    const sidebarWidth = isSidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
    contentView.setBounds({
      x: 0,
      y: HEADER_HEIGHT,
      width: contentBounds.width - sidebarWidth,
      height: contentBounds.height - HEADER_HEIGHT
    });
    const newTab = {
      id: tabId,
      contentView,
      url,
      title: "Loading...",
      isActive: false
    };
    this.tabs.push(newTab);
    windowManager.addChildView(contentView);
    contentView.webContents.loadURL(url);
    this.setupTabEvents(newTab);
    this.activateTab(tabId);
    return tabId;
  }
  // Close a tab by ID
  closeTab(tabId) {
    const tabIndex = this.tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex === -1) return;
    const isActiveTab = this.tabs[tabIndex].isActive;
    const contentView = this.tabs[tabIndex].contentView;
    this.tabs.splice(tabIndex, 1);
    windowManager.removeChildView(contentView);
    if (this.tabs.length === 0) {
      this.createTab(DEFAULT_URL);
      return;
    }
    if (isActiveTab) {
      const newActiveIndex = Math.min(tabIndex, this.tabs.length - 1);
      this.activateTab(this.tabs[newActiveIndex].id);
    }
    this.notifyTabsUpdated();
  }
  // Activate a tab by ID
  activateTab(tabId) {
    const contentBounds = windowManager.getContentBounds();
    const isSidebarExpanded = windowManager.getSidebarState();
    const sidebarWidth = isSidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
    this.tabs.forEach((tab) => {
      if (tab.id === tabId) {
        tab.isActive = true;
        tab.contentView.setBounds({
          x: 0,
          y: HEADER_HEIGHT,
          width: contentBounds.width - sidebarWidth,
          height: contentBounds.height - HEADER_HEIGHT
        });
        this.activeTabId = tabId;
      } else {
        tab.isActive = false;
        tab.contentView.setBounds({
          x: 0,
          y: HEADER_HEIGHT,
          width: contentBounds.width - sidebarWidth,
          height: 0
          // Set height to 0 to hide
        });
      }
    });
    this.notifyTabsUpdated();
    this.notifyNavigationUpdated();
  }
  // Adjust tab layouts when sidebar state changes or window is resized
  updateTabLayoutsForSidebar() {
    const contentBounds = windowManager.getContentBounds();
    const isSidebarExpanded = windowManager.getSidebarState();
    const sidebarWidth = isSidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
    const activeTab = this.getActiveTab();
    if (activeTab) {
      activeTab.contentView.setBounds({
        x: 0,
        y: HEADER_HEIGHT,
        width: contentBounds.width - sidebarWidth,
        height: contentBounds.height - HEADER_HEIGHT
      });
    }
    this.tabs.forEach((tab) => {
      if (!tab.isActive) {
        tab.contentView.setBounds({
          x: 0,
          y: HEADER_HEIGHT,
          width: contentBounds.width - sidebarWidth,
          height: 0
          // Height is 0 for hidden tabs
        });
      }
    });
  }
  // Get all tabs (simplified for renderer)
  getTabs() {
    return this.tabs.map(({ id, url, title, isActive }) => ({
      id,
      url,
      title,
      isActive
    }));
  }
  // Get the currently active tab
  getActiveTab() {
    return this.tabs.find((tab) => tab.isActive);
  }
  // Update tab information
  updateTabInfo(tabId, updates) {
    const tabIndex = this.tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex === -1) return;
    this.tabs[tabIndex] = { ...this.tabs[tabIndex], ...updates };
    this.notifyTabsUpdated();
  }
  // Notify the tabs view of updates
  notifyTabsUpdated() {
    const tabsView = windowManager.getTabsView();
    if (tabsView) {
      tabsView.webContents.send("tabs-updated", this.getTabs());
    }
  }
  // Notify the navigation view of updates
  notifyNavigationUpdated() {
    const activeTab = this.getActiveTab();
    if (!activeTab) return;
    const navigationView = windowManager.getNavigationView();
    if (navigationView) {
      navigationView.webContents.send("url-changed", activeTab.url);
      navigationView.webContents.send(
        "loading-changed",
        activeTab.contentView.webContents.isLoading()
      );
    }
  }
  // Set up events for a tab's WebContentsView
  setupTabEvents(tab) {
    const { contentView, id } = tab;
    contentView.webContents.on("did-navigate", () => {
      const currentUrl = contentView.webContents.getURL();
      tab.url = currentUrl;
      if (tab.isActive) {
        const navigationView = windowManager.getNavigationView();
        if (navigationView) {
          navigationView.webContents.send("url-changed", currentUrl);
        }
      }
      if (!tab.title || tab.title === "Loading...") {
        try {
          const url = new URL(currentUrl);
          const domain = url.hostname;
          this.updateTabInfo(id, { url: currentUrl, title: domain });
        } catch {
          this.updateTabInfo(id, { url: currentUrl });
        }
      } else {
        this.updateTabInfo(id, { url: currentUrl });
      }
    });
    contentView.webContents.on("did-navigate-in-page", () => {
      const currentUrl = contentView.webContents.getURL();
      tab.url = currentUrl;
      if (tab.isActive) {
        const navigationView = windowManager.getNavigationView();
        if (navigationView) {
          navigationView.webContents.send("url-changed", currentUrl);
        }
      }
      this.updateTabInfo(id, { url: currentUrl });
    });
    contentView.webContents.on("page-title-updated", (event, title) => {
      if (title && title.trim() !== "") {
        tab.title = title;
        this.updateTabInfo(id, { title });
      }
    });
    contentView.webContents.on("did-start-loading", () => {
      if (tab.isActive) {
        const navigationView = windowManager.getNavigationView();
        if (navigationView) {
          navigationView.webContents.send("loading-changed", true);
        }
      }
    });
    contentView.webContents.on("did-stop-loading", () => {
      if (!tab.title || tab.title === "Loading...") {
        try {
          const currentUrl = contentView.webContents.getURL();
          const url = new URL(currentUrl);
          const domain = url.hostname;
          tab.title = domain || "New Tab";
          this.updateTabInfo(id, { title: tab.title });
        } catch {
          tab.title = "New Tab";
          this.updateTabInfo(id, { title: tab.title });
        }
      }
      if (tab.isActive) {
        const navigationView = windowManager.getNavigationView();
        if (navigationView) {
          navigationView.webContents.send("loading-changed", false);
        }
      }
    });
  }
}
const tabManager = new TabManager();
const __filename$1 = node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href);
const __dirname$1 = path.dirname(__filename$1);
class WindowManager {
  window = null;
  navigationView = null;
  tabsView = null;
  sidebarView = null;
  isSidebarExpanded = SIDEBAR_DEFAULT_STATE;
  eventEmitter = new node_events.EventEmitter();
  // Create the main window with navigation, tabs, and sidebar views
  async createWindow() {
    const windowOptions = {
      width: 1024,
      height: 768,
      show: false
      // Don't show until everything is ready
    };
    const preloadPath = path.join(__dirname$1, "preload.js");
    const tabsPreloadPath = path.join(__dirname$1, "tabsPreload.js");
    const sidebarPreloadPath = path.join(__dirname$1, "sidebarPreload.js");
    path.join(
      __dirname$1,
      "sidebarBirpcPreload.js"
    );
    console.log("Looking for preload scripts:");
    console.log("Main preload:", preloadPath);
    console.log("Tabs preload:", tabsPreloadPath);
    console.log("Sidebar preload:", sidebarPreloadPath);
    this.window = new electron.BaseWindow(windowOptions);
    this.tabsView = new electron.WebContentsView({
      webPreferences: {
        preload: tabsPreloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        devTools: true
      }
    });
    this.navigationView = new electron.WebContentsView({
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        devTools: true
      }
    });
    this.sidebarView = new electron.WebContentsView({
      webPreferences: {
        preload: sidebarPreloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        devTools: true
      }
    });
    const contentBounds = this.window.getContentBounds();
    this.updateViewBounds(contentBounds);
    this.window.contentView.addChildView(this.tabsView);
    this.window.contentView.addChildView(this.navigationView);
    this.window.contentView.addChildView(this.sidebarView);
    this.window.on("resize", () => this.handleResize());
    await this.loadUIComponents();
    return this.window;
  }
  // Get the current window instance
  getWindow() {
    return this.window;
  }
  // Set content bounds for a child view
  setContentBounds(bounds) {
    if (this.window) ;
  }
  // Get content bounds of the main window
  getContentBounds() {
    if (!this.window) {
      throw new Error("Window not initialized");
    }
    return this.window.getContentBounds();
  }
  // Add a child view to the main window
  addChildView(view) {
    if (this.window) {
      this.window.contentView.addChildView(view);
    }
  }
  // Remove a child view from the main window
  removeChildView(view) {
    if (this.window) {
      this.window.contentView.removeChildView(view);
    }
  }
  // Get the navigation view
  getNavigationView() {
    return this.navigationView;
  }
  // Get the tabs view
  getTabsView() {
    return this.tabsView;
  }
  // Get the sidebar view
  getSidebarView() {
    return this.sidebarView;
  }
  // Toggle sidebar expanded/collapsed state
  toggleSidebar() {
    const previousState = this.isSidebarExpanded;
    this.isSidebarExpanded = !this.isSidebarExpanded;
    if (this.window) {
      const bounds = this.window.getContentBounds();
      this.updateViewBounds(bounds);
      if (this.sidebarView) {
        this.sidebarView.webContents.send(
          "sidebar-state-changed",
          this.isSidebarExpanded
        );
      }
      if (previousState !== this.isSidebarExpanded) {
        this.eventEmitter.emit("sidebar-state-changed", this.isSidebarExpanded);
      }
    }
    return this.isSidebarExpanded;
  }
  // Get current sidebar state
  getSidebarState() {
    return this.isSidebarExpanded;
  }
  // Register a callback for sidebar state changes
  onSidebarStateChanged(callback) {
    this.eventEmitter.on("sidebar-state-changed", callback);
  }
  // Remove a sidebar state change callback
  offSidebarStateChanged(callback) {
    this.eventEmitter.off("sidebar-state-changed", callback);
  }
  // Handle window resize events
  handleResize() {
    if (!this.window) return;
    const newBounds = this.window.getContentBounds();
    this.updateViewBounds(newBounds);
    tabManager.updateTabLayoutsForSidebar();
  }
  // Update view bounds based on current window size and sidebar state
  updateViewBounds(bounds) {
    if (!this.tabsView || !this.navigationView || !this.sidebarView) return;
    const sidebarWidth = this.isSidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
    const contentWidth = bounds.width - sidebarWidth;
    this.tabsView.setBounds({
      x: 0,
      y: 0,
      width: contentWidth,
      height: TAB_BAR_HEIGHT
    });
    this.navigationView.setBounds({
      x: 0,
      y: TAB_BAR_HEIGHT,
      width: contentWidth,
      height: NAVIGATION_HEIGHT
    });
    this.sidebarView.setBounds({
      x: contentWidth,
      y: 0,
      width: sidebarWidth,
      height: bounds.height
    });
  }
  // Load the UI components (tabs, navigation, and sidebar)
  async loadUIComponents() {
    if (!this.window || !this.tabsView || !this.navigationView || !this.sidebarView)
      return;
    {
      this.tabsView.webContents.loadURL(
        `${"http://localhost:5173"}#tabs`
      );
    }
    {
      this.navigationView.webContents.loadURL(
        `${"http://localhost:5173"}#navigation`
      );
    }
    {
      this.sidebarView.webContents.loadURL(
        `${"http://localhost:5173"}#sidebar`
      );
    }
    await Promise.all([
      new Promise((resolve) => {
        if (this.tabsView) {
          this.tabsView.webContents.once("did-finish-load", () => resolve());
        } else {
          resolve();
        }
      }),
      new Promise((resolve) => {
        if (this.navigationView) {
          this.navigationView.webContents.once(
            "did-finish-load",
            () => resolve()
          );
        } else {
          resolve();
        }
      }),
      new Promise((resolve) => {
        if (this.sidebarView) {
          this.sidebarView.webContents.once("did-finish-load", () => resolve());
        } else {
          resolve();
        }
      })
    ]);
    this.window.show();
  }
}
const windowManager = new WindowManager();
class NavigationManager {
  // Navigate to a URL in the active tab
  async navigateToUrl(url) {
    const activeTab = tabManager.getActiveTab();
    if (!activeTab) return false;
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }
    try {
      await activeTab.contentView.webContents.loadURL(url);
      return true;
    } catch (error) {
      console.error("Navigation error:", error);
      return false;
    }
  }
  // Go back in the active tab's history
  goBack() {
    const activeTab = tabManager.getActiveTab();
    if (!activeTab) return false;
    if (activeTab.contentView.webContents.navigationHistory.canGoBack()) {
      activeTab.contentView.webContents.navigationHistory.goBack();
      return true;
    }
    return false;
  }
  // Go forward in the active tab's history
  goForward() {
    const activeTab = tabManager.getActiveTab();
    if (!activeTab) return false;
    if (activeTab.contentView.webContents.navigationHistory.canGoForward()) {
      activeTab.contentView.webContents.navigationHistory.goForward();
      return true;
    }
    return false;
  }
  // Get the current URL of the active tab
  getCurrentUrl() {
    const activeTab = tabManager.getActiveTab();
    return activeTab ? activeTab.contentView.webContents.getURL() : "";
  }
}
const navigationManager = new NavigationManager();
class LlmManager {
  llama = null;
  model = null;
  context = null;
  contextSequence = null;
  chatSession = null;
  abortController = null;
  eventEmitter = new node_events.EventEmitter();
  state = {
    llama: { loaded: false },
    model: { loaded: false, loading: false },
    context: { loaded: false },
    contextSequence: { loaded: false },
    chatSession: { loaded: false, generating: false }
  };
  constructor() {
    this.eventEmitter.setMaxListeners(50);
  }
  /**
   * Load the Llama library
   */
  async loadLlama() {
    try {
      this.updateState({
        llama: { loaded: false }
      });
      if (this.llama) {
        try {
          await this.llama.dispose();
        } catch (err) {
          console.error("Error disposing existing Llama instance:", err);
        }
        this.llama = null;
      }
      this.llama = await nodeLlamaCpp.getLlama();
      this.updateState({
        llama: { loaded: true }
      });
      return true;
    } catch (error) {
      console.error("Failed to load Llama:", error);
      this.updateState({
        llama: { loaded: false, error: String(error) }
      });
      return false;
    }
  }
  /**
   * Load a model from the specified path
   */
  async loadModel(modelPath) {
    try {
      if (!this.llama) {
        const llamaLoaded = await this.loadLlama();
        if (!llamaLoaded) {
          return false;
        }
      }
      this.updateState({
        selectedModelFilePath: modelPath,
        model: { loaded: false, loading: true, loadProgress: 0 }
      });
      if (this.model) {
        try {
          await this.model.dispose();
        } catch (err) {
          console.error("Error disposing existing model:", err);
        }
        this.model = null;
      }
      this.model = await this.llama.loadModel({
        modelPath,
        onLoadProgress: (progress) => {
          this.updateState({
            model: { ...this.state.model, loadProgress: progress }
          });
        }
      });
      const modelName = modelPath.split(/[\\/]/).pop();
      this.updateState({
        model: {
          loaded: true,
          loading: false,
          loadProgress: 1,
          name: modelName
        }
      });
      await this.createContext();
      await this.createContextSequence();
      await this.createChatSession();
      return true;
    } catch (error) {
      console.error("Failed to load model:", error);
      this.updateState({
        model: {
          loaded: false,
          loading: false,
          error: String(error)
        }
      });
      return false;
    }
  }
  /**
   * Create a LlamaContext for the loaded model
   */
  async createContext() {
    try {
      if (!this.model) {
        console.error("Cannot create context: Model not loaded");
        return false;
      }
      this.updateState({
        context: { loaded: false }
      });
      if (this.context) {
        try {
          await this.context.dispose();
        } catch (err) {
          console.error("Error disposing existing context:", err);
        }
        this.context = null;
      }
      this.context = await this.model.createContext();
      this.updateState({
        context: { loaded: true }
      });
      return true;
    } catch (error) {
      console.error("Failed to create context:", error);
      this.updateState({
        context: { loaded: false, error: String(error) }
      });
      return false;
    }
  }
  /**
   * Create a LlamaContextSequence for the loaded context
   */
  async createContextSequence() {
    try {
      if (!this.context) {
        console.error("Cannot create context sequence: Context not loaded");
        return false;
      }
      this.updateState({
        contextSequence: { loaded: false }
      });
      if (this.contextSequence) {
        try {
          this.contextSequence.dispose();
        } catch (err) {
          console.error("Error disposing existing context sequence:", err);
        }
        this.contextSequence = null;
      }
      this.contextSequence = this.context.getSequence();
      this.updateState({
        contextSequence: { loaded: true }
      });
      return true;
    } catch (error) {
      console.error("Failed to create context sequence:", error);
      this.updateState({
        contextSequence: { loaded: false, error: String(error) }
      });
      return false;
    }
  }
  /**
   * Create a LlamaChatSession for the loaded context sequence
   */
  async createChatSession() {
    try {
      if (!this.contextSequence) {
        console.error(
          "Cannot create chat session: Context sequence not loaded"
        );
        return false;
      }
      this.updateState({
        chatSession: { loaded: false, generating: false }
      });
      if (this.chatSession) {
        try {
          this.chatSession.dispose();
        } catch (err) {
          console.error("Error disposing existing chat session:", err);
        }
        this.chatSession = null;
      }
      this.chatSession = new nodeLlamaCpp.LlamaChatSession({
        contextSequence: this.contextSequence,
        autoDisposeSequence: false
      });
      this.updateState({
        chatSession: { loaded: true, generating: false }
      });
      return true;
    } catch (error) {
      console.error("Failed to create chat session:", error);
      this.updateState({
        chatSession: { loaded: false, generating: false, error: String(error) }
      });
      return false;
    }
  }
  /**
   * Send a prompt to the LLM and get a response
   * Supports streaming response chunks
   */
  async sendPrompt(prompt, onResponseChunk) {
    try {
      if (!this.chatSession) {
        const errorMsg = "Chat session not loaded. Please load a model first.";
        console.error(errorMsg);
        return errorMsg;
      }
      this.abortController = new AbortController();
      this.updateState({
        chatSession: { ...this.state.chatSession, generating: true }
      });
      let fullResponse = "";
      const response = await this.chatSession.prompt(prompt, {
        signal: this.abortController.signal,
        onResponseChunk: (chunk) => {
          fullResponse += chunk.text;
          if (onResponseChunk) {
            onResponseChunk(chunk.text);
          }
        }
      });
      this.updateState({
        chatSession: { ...this.state.chatSession, generating: false }
      });
      return response;
    } catch (error) {
      if (this.abortController?.signal.aborted) {
        console.log("Prompt generation was aborted");
        this.updateState({
          chatSession: { ...this.state.chatSession, generating: false }
        });
        return "[Generation stopped]";
      }
      console.error("Error generating response:", error);
      this.updateState({
        chatSession: {
          ...this.state.chatSession,
          generating: false,
          error: String(error)
        }
      });
      return `Error generating response: ${error}`;
    } finally {
      this.abortController = null;
    }
  }
  /**
   * Stop the current generation
   */
  stopGeneration() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.updateState({
        chatSession: { ...this.state.chatSession, generating: false }
      });
    }
  }
  /**
   * Clean up resources
   */
  async dispose() {
    this.stopGeneration();
    if (this.chatSession) {
      try {
        this.chatSession.dispose();
      } catch (err) {
        console.error("Error disposing chat session:", err);
      }
      this.chatSession = null;
    }
    if (this.contextSequence) {
      try {
        this.contextSequence.dispose();
      } catch (err) {
        console.error("Error disposing context sequence:", err);
      }
      this.contextSequence = null;
    }
    if (this.context) {
      try {
        await this.context.dispose();
      } catch (err) {
        console.error("Error disposing context:", err);
      }
      this.context = null;
    }
    if (this.model) {
      try {
        await this.model.dispose();
      } catch (err) {
        console.error("Error disposing model:", err);
      }
      this.model = null;
    }
    if (this.llama) {
      try {
        await this.llama.dispose();
      } catch (err) {
        console.error("Error disposing Llama:", err);
      }
      this.llama = null;
    }
    this.updateState({
      llama: { loaded: false },
      selectedModelFilePath: void 0,
      model: { loaded: false, loading: false },
      context: { loaded: false },
      contextSequence: { loaded: false },
      chatSession: { loaded: false, generating: false }
    });
  }
  /**
   * Get the current state
   */
  getState() {
    return { ...this.state };
  }
  /**
   * Register a listener for state changes
   */
  onStateChanged(callback) {
    this.eventEmitter.on("stateChanged", callback);
  }
  /**
   * Remove a state change listener
   */
  offStateChanged(callback) {
    this.eventEmitter.off("stateChanged", callback);
  }
  /**
   * Check if a model is currently loaded and ready
   */
  isModelReady() {
    return this.state.llama.loaded && this.state.model.loaded && this.state.context.loaded && this.state.contextSequence.loaded && this.state.chatSession.loaded;
  }
  /**
   * Update the state and emit change event
   */
  updateState(partialState) {
    this.state = {
      ...this.state,
      ...partialState,
      // Handle nested objects
      llama: { ...this.state.llama, ...partialState.llama || {} },
      model: { ...this.state.model, ...partialState.model || {} },
      context: { ...this.state.context, ...partialState.context || {} },
      contextSequence: {
        ...this.state.contextSequence,
        ...partialState.contextSequence || {}
      },
      chatSession: {
        ...this.state.chatSession,
        ...partialState.chatSession || {}
      }
    };
    this.eventEmitter.emit("stateChanged", this.state);
  }
}
const llmManager = new LlmManager();
class SidebarManager {
  messages = [];
  // Toggle sidebar expanded/collapsed state
  toggleSidebar() {
    const newState = windowManager.toggleSidebar();
    tabManager.updateTabLayoutsForSidebar();
    return newState;
  }
  // Get current sidebar state
  getSidebarState() {
    return windowManager.getSidebarState();
  }
  // Select and load a model file
  async selectModelFile() {
    try {
      const result = await electron.dialog.showOpenDialog({
        title: "Select LLM Model File",
        filters: [{ name: "GGUF Model Files", extensions: ["gguf"] }],
        properties: ["openFile"]
      });
      if (result.canceled || result.filePaths.length === 0) {
        return false;
      }
      const modelPath = result.filePaths[0];
      const loadingMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: `Loading model: ${modelPath.split(/[\\/]/).pop()}...`,
        sender: "system",
        timestamp: Date.now()
      };
      this.messages.push(loadingMessage);
      this.notifySidebarOfMessage(loadingMessage);
      const success = await llmManager.loadModel(modelPath);
      if (success) {
        loadingMessage.content = `Model loaded successfully: ${llmManager.getState().model.name}`;
        this.notifySidebarOfMessage(loadingMessage);
        return true;
      } else {
        const error = llmManager.getState().model.error || "Unknown error";
        loadingMessage.content = `Failed to load model: ${error}`;
        this.notifySidebarOfMessage(loadingMessage);
        return false;
      }
    } catch (error) {
      console.error("Error in selectModelFile:", error);
      return false;
    }
  }
  // Handle a new message from the user
  async sendChatMessage(messageContent) {
    const userMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: messageContent,
      sender: "user",
      timestamp: Date.now()
    };
    this.messages.push(userMessage);
    this.notifySidebarOfMessage(userMessage);
    const aiMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: "",
      sender: "ai",
      timestamp: Date.now(),
      streaming: true
      // Mark as streaming initially
    };
    this.messages.push(aiMessage);
    this.notifySidebarOfMessage(aiMessage);
    try {
      if (llmManager.isModelReady()) {
        await llmManager.sendPrompt(messageContent, (chunk) => {
          aiMessage.content += chunk;
          this.notifySidebarOfMessage(aiMessage);
        });
      } else {
        aiMessage.content = `No LLM model loaded. Please load a .gguf model file to get AI-generated responses. For now, I'll just echo: "${messageContent}"`;
        this.notifySidebarOfMessage(aiMessage);
      }
    } catch (error) {
      console.error("Error generating AI response:", error);
      aiMessage.content += `

Error generating response: ${error}`;
      this.notifySidebarOfMessage(aiMessage);
    } finally {
      aiMessage.streaming = false;
      this.notifySidebarOfMessage(aiMessage);
    }
    return aiMessage;
  }
  // Stop the current message generation
  stopMessageGeneration() {
    llmManager.stopGeneration();
  }
  // Get all chat messages
  getMessages() {
    return [...this.messages];
  }
  // Get the current LLM state
  getLlmState() {
    return llmManager.getState();
  }
  // Subscribe to LLM state changes
  subscribeLlmStateChanges(callback) {
    llmManager.onStateChanged(callback);
  }
  // Unsubscribe from LLM state changes
  unsubscribeLlmStateChanges(callback) {
    llmManager.offStateChanged(callback);
  }
  // Notify the sidebar view of a new or updated message
  notifySidebarOfMessage(message) {
    const sidebarView = windowManager.getSidebarView();
    if (sidebarView) {
      sidebarView.webContents.send("chat-message-received", message);
    }
  }
}
const sidebarManager = new SidebarManager();
class IpcHandler {
  // Setup all IPC handlers
  setupHandlers() {
    this.setupTabHandlers();
    this.setupNavigationHandlers();
    this.setupSidebarHandlers();
  }
  // Setup IPC handlers for tab management
  setupTabHandlers() {
    electron.ipcMain.handle(IPC_CHANNELS.CREATE_TAB, async (_event, url) => {
      return tabManager.createTab(url);
    });
    electron.ipcMain.handle(IPC_CHANNELS.CLOSE_TAB, async (_event, tabId) => {
      tabManager.closeTab(tabId);
      return true;
    });
    electron.ipcMain.handle(IPC_CHANNELS.SWITCH_TAB, async (_event, tabId) => {
      tabManager.activateTab(tabId);
      return true;
    });
    electron.ipcMain.handle(IPC_CHANNELS.GET_TABS, () => {
      return tabManager.getTabs();
    });
  }
  // Setup IPC handlers for navigation
  setupNavigationHandlers() {
    electron.ipcMain.handle(IPC_CHANNELS.NAVIGATE_TO, async (_event, url) => {
      return navigationManager.navigateToUrl(url);
    });
    electron.ipcMain.handle(IPC_CHANNELS.GO_BACK, () => {
      return navigationManager.goBack();
    });
    electron.ipcMain.handle(IPC_CHANNELS.GO_FORWARD, () => {
      return navigationManager.goForward();
    });
    electron.ipcMain.handle(IPC_CHANNELS.GET_CURRENT_URL, () => {
      return navigationManager.getCurrentUrl();
    });
  }
  // Setup IPC handlers for sidebar
  setupSidebarHandlers() {
    electron.ipcMain.handle(IPC_CHANNELS.TOGGLE_SIDEBAR, () => {
      return sidebarManager.toggleSidebar();
    });
    electron.ipcMain.handle(IPC_CHANNELS.GET_SIDEBAR_STATE, () => {
      return sidebarManager.getSidebarState();
    });
    electron.ipcMain.handle(IPC_CHANNELS.SEND_CHAT_MESSAGE, async (_event, message) => {
      return sidebarManager.sendChatMessage(message);
    });
    electron.ipcMain.handle(IPC_CHANNELS.STOP_CHAT_GENERATION, () => {
      return sidebarManager.stopMessageGeneration();
    });
    electron.ipcMain.handle(IPC_CHANNELS.SELECT_MODEL_FILE, async () => {
      return sidebarManager.selectModelFile();
    });
    electron.ipcMain.handle(IPC_CHANNELS.GET_LLM_STATE, () => {
      return sidebarManager.getLlmState();
    });
    sidebarManager.subscribeLlmStateChanges((state) => {
      const sidebarView = windowManager.getSidebarView();
      if (sidebarView) {
        sidebarView.webContents.send(IPC_CHANNELS.LLM_STATE_CHANGED, state);
      }
    });
  }
}
const ipcHandler = new IpcHandler();
function createMainSideBirpc(channel, window, mainFunctions) {
  return birpc.createBirpc(mainFunctions, {
    post: (data) => {
      if (window) {
        window.send(channel, data);
      }
    },
    on: (listener) => {
      const handler = (_event, data) => {
        listener(data);
      };
      electron.ipcMain.on(channel, handler);
      return () => {
        electron.ipcMain.removeListener(channel, handler);
      };
    },
    serialize: (data) => JSON.stringify(data),
    deserialize: (message) => JSON.parse(message)
  });
}
class BirpcManager {
  sidebarRpc = null;
  sidebarState = false;
  // Initialize the RPC connections
  initialize(sidebarWindow) {
    this.sidebarState = sidebarManager.getSidebarState();
    this.sidebarRpc = createMainSideBirpc(
      "sidebar-rpc",
      sidebarWindow.webContents,
      {
        // Sidebar functions
        toggleSidebar: async () => {
          return sidebarManager.toggleSidebar();
        },
        getSidebarState: async () => {
          return sidebarManager.getSidebarState();
        },
        // Chat functions
        sendChatMessage: async (message) => {
          return sidebarManager.sendChatMessage(message);
        },
        stopChatGeneration: async () => {
          sidebarManager.stopMessageGeneration();
        },
        getChatMessages: async () => {
          return sidebarManager.getMessages();
        },
        // LLM functions
        selectModelFile: async () => {
          return sidebarManager.selectModelFile();
        },
        getLlmState: async () => {
          return llmManager.getState();
        }
      }
    );
    this.setupListeners();
  }
  // Set up event listeners
  setupListeners() {
    llmManager.onStateChanged((state) => {
      if (this.sidebarRpc) {
        this.sidebarRpc.onLlmStateChanged(state);
      }
    });
    windowManager.onSidebarStateChanged((isExpanded) => {
      if (this.sidebarRpc && this.sidebarState !== isExpanded) {
        this.sidebarState = isExpanded;
        this.sidebarRpc.onSidebarStateChanged(isExpanded);
      }
    });
  }
  // Notify the sidebar of a new or updated chat message
  notifyChatMessage(message) {
    if (this.sidebarRpc) {
      this.sidebarRpc.onChatMessageReceived(message);
    }
  }
}
const birpcManager = new BirpcManager();
const started = startupHandler;
if (started) {
  electron.app.quit();
}
electron.app.whenReady().then(async () => {
  await windowManager.createWindow();
  ipcHandler.setupHandlers();
  const sidebarView = windowManager.getSidebarView();
  if (sidebarView) {
    sidebarView.webContents.on("did-finish-load", () => {
      birpcManager.initialize(sidebarView);
    });
  }
  tabManager.createTab(DEFAULT_URL);
});
electron.app.on("window-all-closed", async () => {
  await llmManager.dispose();
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", async () => {
  if (electron.BaseWindow.getAllWindows().length === 0) {
    await windowManager.createWindow();
    tabManager.createTab(DEFAULT_URL);
  }
});
