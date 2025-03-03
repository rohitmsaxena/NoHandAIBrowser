import { BaseWindow, WebContentsView } from "electron";

// Tab information
export interface TabInfo {
  id: string;
  contentView: WebContentsView;
  url: string;
  title: string;
  isActive: boolean;
}

// Simplified tab info for sending to renderer
export interface RendererTabInfo {
  id: string;
  url: string;
  title: string;
  isActive: boolean;
}

// Window manager interface
export interface IWindowManager {
  createWindow(): Promise<BaseWindow>;
  getWindow(): BaseWindow | null;
  setContentBounds(bounds: Electron.Rectangle): void;
  getContentBounds(): Electron.Rectangle;
  addChildView(view: WebContentsView): void;
  removeChildView(view: WebContentsView): void;
}

// Tab manager interface
export interface ITabManager {
  createTab(url: string): string;
  closeTab(tabId: string): void;
  activateTab(tabId: string): void;
  getTabs(): RendererTabInfo[];
  getActiveTab(): TabInfo | undefined;
  updateTabInfo(tabId: string, updates: Partial<TabInfo>): void;
}

// Navigation manager interface
export interface INavigationManager {
  navigateToUrl(url: string): Promise<boolean>;
  goBack(): boolean;
  goForward(): boolean;
  getCurrentUrl(): string;
}
