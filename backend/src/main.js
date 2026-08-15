const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  dialog,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { resolveAssetPath, formatDateString } = require("./utils/paths");
const { getPool, initDatabase, closeDatabase, getAllSettings, purgeOldSessions } = require("./db");
const {
  setActiveWinFn,
  getIsPaused,
  setIsPaused,
  startTracking,
  stopTracking,
  setupPowerMonitor,
} = require("./models");
const { logger } = require("./utils/logger");
const { registerIpcRoutes } = require("./routes/ipc.routes");

// Resolve app icon — works in both dev (project root) and packaged (asar) mode
const appIconPath = resolveAssetPath("assets", "icon", "256x256.png");

let mainWindow = null;

// Cache settings for synchronous access during window creation
let cachedSettings = {};

const getMainWindow = () => mainWindow;
const getCachedSettings = () => cachedSettings;

// ─── Tray ────────────────────────────────────────────────────────────────────

let tray = null;

// Resolve tray icon from the existing PNG assets (nativeImage does NOT support SVG)
const trayIconDir = resolveAssetPath("assets", "icon");

function getTrayIcon() {
  // Use 16x16 for tray, fall back to larger sizes
  for (const size of ["16x16.png", "32x32.png", "48x48.png", "icon.png"]) {
    const iconFile = path.join(trayIconDir, size);
    if (fs.existsSync(iconFile)) {
      const img = nativeImage.createFromPath(iconFile);
      if (!img.isEmpty()) {
        // Resize to 16x16 for consistent tray display
        return img.resize({ width: 16, height: 16 });
      }
    }
  }
  // Ultimate fallback: create a tiny 16x16 blue square PNG
  return nativeImage.createEmpty();
}

function showOrRestoreWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

function createTray() {
  const icon = getTrayIcon();
  if (icon.isEmpty()) {
    logger.error("Failed to load any tray icon — tray may be invisible");
  }
  tray = new Tray(icon);
  tray.setToolTip("ProcWatch");
  updateTrayMenu();

  tray.on("click", () => {
    showOrRestoreWindow();
  });
}

async function getTodaySummary() {
  try {
    const pool = getPool();
    const today = formatDateString(new Date());
    const result = await pool.query(
      `SELECT app_name, SUM(duration_seconds) as seconds
       FROM sessions
       WHERE date(start_time, 'localtime') = $1 AND is_idle = 0
       GROUP BY app_name
       ORDER BY seconds DESC
       LIMIT 3`,
      [today]
    );
    return result.rows.map((r) => {
      const mins = Math.round(r.seconds / 60);
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      const dur = hrs > 0 ? `${hrs}h ${remMins}m` : `${remMins}m`;
      return `${r.app_name} — ${dur}`;
    });
  } catch {
    return [];
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const isPaused = getIsPaused();

  getTodaySummary().then((summaryItems) => {
    if (!tray) return;

    const summaryLabels = summaryItems.length > 0
      ? summaryItems.map((label) => ({ label, enabled: false }))
      : [{ label: "No data yet", enabled: false }];

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open Dashboard",
        click: () => {
          showOrRestoreWindow();
        },
      },
      {
        type: "separator",
      },
      {
        label: "Today's Summary",
        submenu: summaryLabels,
      },
      {
        type: "separator",
      },
      {
        label: isPaused ? "Resume Tracking" : "Pause Tracking",
        click: () => {
          if (isPaused) {
            setIsPaused(false);
            startTracking();
          } else {
            stopTracking();
            setIsPaused(true);
          }
          updateTrayMenu();
        },
      },
      {
        type: "separator",
      },
      {
        label: "Quit",
        click: () => {
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
  });

  tray.setToolTip(isPaused ? "ProcWatch (Paused)" : "ProcWatch");
}

// ─── Window ──────────────────────────────────────────────────────────────────

async function createWindow() {
  const startMinimized =
    cachedSettings.start_minimized === "true" &&
    cachedSettings.first_run_complete === "true";

  // Build a multi-resolution icon for best Linux/X11 compatibility
  const iconDir = resolveAssetPath("assets", "icon");
  const iconSizes = ["16x16.png", "32x32.png", "48x48.png", "64x64.png", "128x128.png", "256x256.png", "512x512.png", "1024x1024.png"];
  const appIcon = nativeImage.createEmpty();
  for (const size of iconSizes) {
    const iconFile = path.join(iconDir, size);
    if (fs.existsSync(iconFile)) {
      const sizeImage = nativeImage.createFromPath(iconFile);
      if (!sizeImage.isEmpty()) {
        appIcon.addRepresentation({
          width: sizeImage.getSize().width,
          height: sizeImage.getSize().height,
          buffer: sizeImage.toPNG(),
        });
      }
    }
  }

  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: !startMinimized,
    autoHideMenuBar: true,
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
    console.log(`[RENDERER CONSOLE] [level ${level}] ${message} (${sourceId}:${line})`);
  });
  mainWindow.webContents.on("render-process-gone", (event, details) => {
    console.error("[RENDERER PROCESS GONE]", details);
  });

  // Explicitly set the icon after creation — ensures _NET_WM_ICON is set on X11
  mainWindow.setIcon(appIcon);


  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.webContents.session.clearCache().catch(() => {});
    const frontendPath = path.join(__dirname, "..", "..", "frontend", "dist", "index.html");
    mainWindow.loadFile(frontendPath);
  }

  mainWindow.on("close", (e) => {
    if (cachedSettings.close_to_tray === "true") {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── App Lifecycle ───────────────────────────────────────────────────────────

// Set the app name and desktop filename so the WM_CLASS matches
// the .desktop file, ensuring the icon shows in the taskbar/dock on Linux.
app.name = "procwatch";
if (process.platform === "linux") {
  app.commandLine.appendSwitch("class", "procwatch");
}
app.setDesktopName("procwatch.desktop");

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showOrRestoreWindow();
  });

  app.whenReady().then(async () => {
    // Load active-win
    try {
      const activeWin = require("active-win");
      setActiveWinFn(activeWin);
    } catch (err) {
      logger.error("Failed to load active-win:", err);
    }

    await initDatabase();
    await purgeOldSessions();

    // Cache settings for synchronous access
    cachedSettings = getAllSettings();

    registerIpcRoutes({ getMainWindow, getCachedSettings, updateTrayMenu, appIconPath });
    await createWindow();
    createTray();
    setupPowerMonitor();
    await startTracking();

    // Purge old sessions daily
    setInterval(() => {
      purgeOldSessions().catch((err) => logger.error("Purge error:", err));
    }, 24 * 60 * 60 * 1000);
  }).catch((err) => {
    logger.error("Application failed to start:", err.message, err.stack);
    dialog.showErrorBox(
      "Startup Error",
      `The application failed to start due to a critical error:\n\n${err.message || err}`
    );
    app.quit();
  });

  app.on("before-quit", () => {
    stopTracking();
    closeDatabase();
  });

  app.on("window-all-closed", () => {
    // Don't quit — tray keeps the app alive
  });
}
