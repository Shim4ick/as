import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, desktopCapturer, Notification, shell } from "electron";
import path from "path";
import { autoUpdater } from "electron-updater";

const APP_URL = process.env.AS_APP_URL || "https://as.yourdomain.com";
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    title: "as.",
    backgroundColor: "#0a0a0f",
    titleBarStyle: "hiddenInset",
    frame: process.platform !== "darwin",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(isDev ? "http://localhost:3000" : APP_URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Открыть as.",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: "separator" },
    {
      label: "Выход",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("as.");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function setupIPC() {
  ipcMain.handle("get-screen-sources", async () => {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true,
    });

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      appIcon: source.appIcon?.toDataURL() || null,
    }));
  });

  ipcMain.handle(
    "show-notification",
    (_, data: { title: string; body: string }) => {
      new Notification({ title: data.title, body: data.body }).show();
    },
  );
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupIPC();

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on("before-quit", () => {
  app.isQuitting = true;
});

declare module "electron" {
  interface App {
    isQuitting: boolean;
  }
}

app.isQuitting = false;
