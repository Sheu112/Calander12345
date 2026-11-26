/** Bridge exposed by electron/preload.cjs. Undefined when running in a plain browser. */
export interface DesktopBridge {
  platform: string;
  setTheme: (theme: 'light' | 'dark') => void;
  onMenu: (cb: (cmd: string) => void) => () => void;
}

export const desktop: DesktopBridge | undefined = (window as unknown as { desktop?: DesktopBridge }).desktop;
export const isMacApp = desktop?.platform === 'darwin';
