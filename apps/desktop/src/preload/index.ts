import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getScreenSources: () => ipcRenderer.invoke("get-screen-sources"),
  showNotification: (data: { title: string; body: string }) =>
    ipcRenderer.invoke("show-notification", data),
  platform: process.platform,
  isElectron: true,
});

declare global {
  interface Window {
    electronAPI?: {
      getScreenSources: () => Promise<
        Array<{
          id: string;
          name: string;
          thumbnail: string;
          appIcon: string | null;
        }>
      >;
      showNotification: (data: { title: string; body: string }) => Promise<void>;
      platform: string;
      isElectron: boolean;
    };
  }
}
