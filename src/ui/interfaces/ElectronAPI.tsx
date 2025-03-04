export interface ElectronAPI {
  navigateTo: (url: string) => Promise<boolean>;
  goBack: () => Promise<boolean>;
  goForward: () => Promise<boolean>;
  getCurrentUrl: () => Promise<string>;
  onUrlChange: (callback: (url: string) => void) => void;
  onLoadingChange: (callback: (isLoading: boolean) => void) => void;
  removeListeners: () => void;
  createTab: (url?: string) => Promise<string>;
  selectModelFile: () => Promise<string | null>;
}
