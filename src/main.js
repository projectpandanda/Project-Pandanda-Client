const {
  app,
  BrowserWindow,
  BrowserView,
  session,
  shell,
  ipcMain,
} = require("electron");
const path = require("path");
const RPC = require("discord-rpc");
const rootPath = process.resourcesPath;
const iconMap = {
  win32: "icon.ico",
  darwin: "icon.icns",
  linux: "icon.png",
};
let rpcInterval;

if (process.platform !== "darwin")
  require("update-electron-app")({
    repo: "projectpandanda/Project-Pandanda-Client",
  });

if (require("electron-squirrel-startup")) {
  app.quit();
  return;
}

if (process.platform === "win32") {
  app.setAppUserModelId("org.pdnorg.client");
}

const mainURL = "https://play.pandanda.org/";

const ALLOWED_ORIGIN = "https://play.pandanda.org";

const pluginPaths = {
  win32: path.join(rootPath, "plugins", "pepflashplayer.dll"),
  darwin: path.join(rootPath, "plugins", "PepperFlashPlayer.plugin"),
  linux: path.join(rootPath, "plugins", "libpepflashplayer.so"),
};

if (process.platform === "linux") app.commandLine.appendSwitch("no-sandbox");
const pluginName = pluginPaths[process.platform];

app.commandLine.appendSwitch("ppapi-flash-path", pluginName);
app.commandLine.appendSwitch("ppapi-flash-version", "34.0.0.330");

const clientId = "1432054377211756626";
RPC.register(clientId);
const rpc = new RPC.Client({ transport: "ipc" });

const activities = [
  "Exploring Pandanda Land!",
  "Chilling at the Coconut Beach!",
  "Chasing bunnies in Darby Field!",
  "Hanging out with Panda friends!",
  "Catching ghosts in Misty Hill!",
  "Decorating my tree house!",
  "Taking care of my dragon pets!",
  "Catching fish!",
  "Questing!",
];

rpc.on("ready", () => {
  const setRandomActivity = () => {
    const randomActivity =
      activities[Math.floor(Math.random() * activities.length)];

    rpc.setActivity({
      details: randomActivity,
      largeImageKey: "icon",
      largeImageText: "Pandanda.org",
      startTimestamp: new Date(),
    });
  };

  setRandomActivity();
  rpcInterval = setInterval(setRandomActivity, 300000);
});

rpc.login({ clientId }).catch(() => {});

let mainWindow;
const TITLEBAR_HEIGHT = 32;

ipcMain.on("window-minimize", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("window-close", () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

function createWindow() {
  const iconPath = path.join(
    rootPath,
    "lib",
    "assets",
    iconMap[process.platform] || "icon.png",
  );

  mainWindow = new BrowserWindow({
    width: 1035,
    height: 750,
    minWidth: 1035,
    minHeight: 750,
    autoHideMenuBar: true,
    backgroundColor: "#47b3e9",
    fullscreenable: true,
    show: false,
    frame: false,
    webPreferences: {
      devTools: false,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      sandbox: true,
      webSecurity: true,
    },
    icon: iconPath,
  });

  mainWindow.on("closed", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBrowserView(null);
    }

    mainWindow = null;
  });

  mainWindow.loadFile(path.join(__dirname, "titlebar.html"));

  const view = new BrowserView({
    webPreferences: {
      plugins: true,
      devTools: false,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  view.webContents.on("before-input-event", (event, input) => {
    const isZoomShortcut =
      input.control &&
      (input.key === "+" ||
        input.key === "-" ||
        input.key === "=" ||
        input.key === "0");

    if (isZoomShortcut) {
      event.preventDefault();
    }
  });

  if (typeof view.webContents.setWindowOpenHandler === "function") {
    view.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);

      return { action: "deny" };
    });
  } else {
    view.webContents.on("new-window", (e, url) => {
      e.preventDefault();

      shell.openExternal(url);
    });
  }

  view.webContents.on("will-navigate", (event, urlString) => {
    try {
      const origin = new URL(urlString).origin;

      if (origin !== ALLOWED_ORIGIN) {
        event.preventDefault();
        shell.openExternal(urlString);
      }
    } catch {
      event.preventDefault();
    }
  });

  mainWindow.setBrowserView(view);

  mainWindow.webContents.on("before-input-event", (event, input) => {
    const isZoomShortcut =
      input.control &&
      (input.key === "+" ||
        input.key === "-" ||
        input.key === "=" ||
        input.key === "0");

    if (isZoomShortcut) {
      event.preventDefault();
    }
  });

  const resizeView = () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    const [width, height] = mainWindow.getContentSize();

    const isFullscreen = mainWindow.isFullScreen();

    view.setBounds({
      x: 0,
      y: isFullscreen ? 0 : TITLEBAR_HEIGHT,
      width: width,
      height: isFullscreen ? height : height - TITLEBAR_HEIGHT,
    });
  };
  view.webContents.once("did-finish-load", () => {
    mainWindow.show();
  });

  view.setAutoResize({
    width: true,
    height: true,
  });

  view.webContents.loadURL(mainURL);
  resizeView();
  mainWindow.on("resize", resizeView);
  mainWindow.on("maximize", resizeView);
  mainWindow.on("unmaximize", resizeView);
  mainWindow.on("enter-full-screen", resizeView);
  mainWindow.on("leave-full-screen", resizeView);
  mainWindow.on("enter-html-full-screen", resizeView);
  mainWindow.on("leave-html-full-screen", resizeView);
}

app.on("ready", () => {
  session.defaultSession.setPermissionRequestHandler(
    (_, permission, callback) => {
      callback(permission === "fullscreen");
    },
  );

  session.defaultSession.clearCache().catch(() => {});

  createWindow();
});

app.on("activate", () => {
  if (!mainWindow) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async (event) => {
  event.preventDefault();

  if (rpcInterval) {
    clearInterval(rpcInterval);
    rpcInterval = null;
  }

  try {
    await rpc.clearActivity();
    await rpc.destroy();
  } catch {}

  process.exit(0);
});
