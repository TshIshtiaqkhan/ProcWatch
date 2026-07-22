const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  dialog,
} = require("electron");
const path = require("path");
const fs = require("fs");

// Resolve app icon — works in both dev (project root) and packaged (asar) mode
const appIconPath = app.isPackaged
  ? path.join(process.resourcesPath, "assets", "icon", "256x256.png")
  : path.join(__dirname, "..", "..", "assets", "icon", "256x256.png");
const { execFile } = require("child_process");
const {
  initDatabase,
  closeDatabase,
  getPool,
  getSetting,
  setSetting,
  purgeOldSessions,
  DEFAULT_SETTINGS,
} = require("./database");
const {
  setActiveWinFn,
  isActiveWinLoaded,
  getIsPaused,
  setIsPaused,
  getCurrentSession,
  startTracking,
  stopTracking,
  setupPowerMonitor,
} = require("./tracker.engine");
const { logger } = require("./logger");

// ─── IPC Helpers ─────────────────────────────────────────────────────────────

function ok(data) {
  return { success: true, data };
}

function fail(code, message) {
  return { success: false, error: { code, message } };
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

function registerIpcHandlers() {
  const pool = getPool();

  // ── Usage queries ──

  ipcMain.handle("usage:getToday", async () => {
    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const result = await pool.query(
        `SELECT app_name, SUM(duration_seconds) as seconds
         FROM sessions
         WHERE date(start_time, 'localtime') = $1 AND is_idle = 0
         GROUP BY app_name
         ORDER BY seconds DESC`,
        [today]
      );
      const idleResult = await pool.query(
        `SELECT COALESCE(SUM(duration_seconds), 0) as seconds
         FROM sessions
         WHERE date(start_time, 'localtime') = $1 AND is_idle = 1`,
        [today]
      );
      return ok({ apps: result.rows, idleSeconds: idleResult.rows[0]?.seconds ?? 0 });
    } catch (err) {
      return fail("QUERY_ERROR", String(err));
    }
  });

  ipcMain.handle("usage:getRange", async (_e, payload) => {
    try {
      if (!payload || typeof payload.startDate !== "string" || typeof payload.endDate !== "string") {
        return fail("INVALID_INPUT", "startDate and endDate are required strings");
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(payload.startDate) || !dateRegex.test(payload.endDate)) {
        return fail("INVALID_INPUT", "Dates must be in YYYY-MM-DD format");
      }
      const result = await pool.query(
        `SELECT date(start_time, 'localtime') as date, app_name, SUM(duration_seconds) as seconds
         FROM sessions
         WHERE date(start_time, 'localtime') BETWEEN $1 AND $2 AND is_idle = 0
         GROUP BY date(start_time, 'localtime'), app_name
         ORDER BY date(start_time, 'localtime'), seconds DESC`,
        [payload.startDate, payload.endDate]
      );
      return ok(result.rows);
    } catch (err) {
      return fail("QUERY_ERROR", String(err));
    }
  });

  ipcMain.handle(
    "usage:getAppDetail",
    async (_e, payload) => {
      try {
        if (!payload || typeof payload.appName !== "string" || !payload.appName.trim()) {
          return fail("INVALID_INPUT", "appName is required");
        }
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (typeof payload.startDate !== "string" || typeof payload.endDate !== "string" ||
            !dateRegex.test(payload.startDate) || !dateRegex.test(payload.endDate)) {
          return fail("INVALID_INPUT", "startDate and endDate must be YYYY-MM-DD");
        }

        const dailyResult = await pool.query(
          `SELECT date(start_time, 'localtime') as date, SUM(duration_seconds) as seconds
           FROM sessions
           WHERE app_name = $1 AND date(start_time, 'localtime') BETWEEN $2 AND $3 AND is_idle = 0
           GROUP BY date(start_time, 'localtime')
           ORDER BY date(start_time, 'localtime')`,
          [payload.appName, payload.startDate, payload.endDate]
        );

        const titlesResult = await pool.query(
          `SELECT window_title, SUM(duration_seconds) as seconds
           FROM sessions
           WHERE app_name = $1 AND date(start_time, 'localtime') BETWEEN $2 AND $3 AND is_idle = 0
           GROUP BY window_title
           ORDER BY seconds DESC`,
          [payload.appName, payload.startDate, payload.endDate]
        );

        return ok({ daily: dailyResult.rows, titles: titlesResult.rows });
      } catch (err) {
        return fail("QUERY_ERROR", String(err));
      }
    }
  );

  // ── Tracking control ──

  ipcMain.handle("tracking:pause", async () => {
    try {
      if (getCurrentSession()) {
        await stopTracking();
      }
      setIsPaused(true);
      updateTrayMenu();
      return ok({ isPaused: true });
    } catch (err) {
      return fail("PAUSE_ERROR", String(err));
    }
  });

  ipcMain.handle("tracking:resume", async () => {
    try {
      setIsPaused(false);
      await startTracking();
      updateTrayMenu();
      return ok({ isPaused: false });
    } catch (err) {
      return fail("RESUME_ERROR", String(err));
    }
  });

  ipcMain.handle("tracking:status", () => {
    try {
      return ok({ isPaused: getIsPaused() });
    } catch (err) {
      return fail("STATUS_ERROR", String(err));
    }
  });

  // ── Settings ──

  ipcMain.handle("settings:get", async () => {
    try {
      const result = await pool.query("SELECT key, value FROM settings");
      const settings = {};
      for (const row of result.rows) {
        settings[row.key] = row.value;
      }
      return ok(settings);
    } catch (err) {
      return fail("QUERY_ERROR", String(err));
    }
  });

  ipcMain.handle("settings:update", async (_e, payload) => {
    try {
      if (!payload || typeof payload !== "object") {
        return fail("INVALID_INPUT", "Settings payload is required");
      }
      const allowedKeys = new Set(Object.keys(DEFAULT_SETTINGS));
      for (const key of Object.keys(payload)) {
        if (!allowedKeys.has(key)) {
          return fail("INVALID_INPUT", `Unknown setting key: ${key}`);
        }
      }
      for (const [key, value] of Object.entries(payload)) {
        cachedSettings[key] = value;
        await pool.query(
          "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
          [key, value]
        );
      }

      // If polling interval changed, restart tracking
      if ("polling_interval_seconds" in payload && !getIsPaused()) {
        await stopTracking();
        await startTracking();
      }

      return ok();
    } catch (err) {
      return fail("UPDATE_ERROR", String(err));
    }
  });

  // ── Data export ──

  ipcMain.handle("data:export", async (_e, payload) => {
    try {
      if (!payload || (payload.format !== "csv" && payload.format !== "json")) {
        return fail("INVALID_INPUT", "Format must be 'csv' or 'json'");
      }
      const result = await pool.query("SELECT * FROM sessions ORDER BY start_time");
      const rows = result.rows;

      const filters =
        payload.format === "csv"
          ? [{ name: "CSV", extensions: ["csv"] }]
          : [{ name: "JSON", extensions: ["json"] }];

      const dialogResult = mainWindow
        ? await dialog.showSaveDialog(mainWindow, {
            title: "Export Data",
            defaultPath: `screen-time-data.${payload.format}`,
            filters,
          })
        : await dialog.showSaveDialog({
            title: "Export Data",
            defaultPath: `screen-time-data.${payload.format}`,
            filters,
          });

      if (dialogResult.canceled || !dialogResult.filePath) {
        return ok({ canceled: true });
      }

      if (payload.format === "json") {
        fs.writeFileSync(dialogResult.filePath, JSON.stringify(rows, null, 2));
      } else {
        const keys = Object.keys(rows[0] || {});
        const header = keys.join(",");
        const csvRows = rows.map((row) =>
          keys.map((k) => JSON.stringify(row[k] ?? "")).join(",")
        );
        fs.writeFileSync(dialogResult.filePath, [header, ...csvRows].join("\n"));
      }

      return ok({ path: dialogResult.filePath });
    } catch (err) {
      return fail("EXPORT_ERROR", String(err));
    }
  });

  // ── Data clear ──

  ipcMain.handle("data:clearAll", async () => {
    try {
      logger.warn("CRITICAL: User triggered data:clearAll. Purging all tracking sessions!");
      await pool.query("DELETE FROM sessions");
      return ok();
    } catch (err) {
      return fail("CLEAR_ERROR", String(err));
    }
  });

  // ── Categories ──

  ipcMain.handle("categories:list", async () => {
    try {
      const result = await pool.query(
        "SELECT app_name, category FROM app_categories ORDER BY app_name"
      );
      return ok(result.rows);
    } catch (err) {
      return fail("QUERY_ERROR", String(err));
    }
  });

  ipcMain.handle(
    "categories:update",
    async (_e, payload) => {
      try {
        if (!payload || typeof payload.appName !== "string" || !payload.appName.trim() ||
            typeof payload.category !== "string" || !payload.category.trim()) {
          return fail("INVALID_INPUT", "appName and category are required non-empty strings");
        }
        await pool.query(
          "INSERT INTO app_categories (app_name, category) VALUES ($1, $2) ON CONFLICT (app_name) DO UPDATE SET category = $2",
          [payload.appName, payload.category]
        );
        return ok();
      } catch (err) {
        return fail("UPDATE_ERROR", String(err));
      }
    }
  );

  ipcMain.handle(
    "categories:remove",
    async (_e, payload) => {
      try {
        if (!payload || typeof payload.appName !== "string" || !payload.appName.trim()) {
          return fail("INVALID_INPUT", "appName is required");
        }
        await pool.query("DELETE FROM app_categories WHERE app_name = $1", [payload.appName]);
        return ok();
      } catch (err) {
        return fail("DELETE_ERROR", String(err));
      }
    }
  );

  // ── System ──

  ipcMain.handle("system:checkDeps", async () => {
    const promisified = (cmd, args) =>
      new Promise((resolve) => {
        execFile(cmd, args, (err) => resolve(!err));
      });

    const [xdotool, wmctrl] = await Promise.all([
      promisified("which", ["xdotool"]),
      promisified("which", ["wmctrl"]),
    ]);

    const sessionType = process.env.XDG_SESSION_TYPE ?? "unknown";

    return ok({
      xdotool,
      wmctrl,
      sessionType,
      isWayland: sessionType === "wayland",
    });
  });

  ipcMain.handle("system:setAutoStart", async (_e, payload) => {
    try {
      if (!payload || typeof payload.enabled !== "boolean") {
        return fail("INVALID_INPUT", "enabled must be a boolean");
      }
      const autoStartDir = path.join(
        process.env.XDG_CONFIG_HOME || path.join(app.getPath("home"), ".config"),
        "autostart"
      );
      fs.mkdirSync(autoStartDir, { recursive: true });
      const desktopPath = path.join(autoStartDir, "screen-time-tracker.desktop");

      if (payload.enabled) {
        const execPath = app.isPackaged
          ? app.getPath("exe")
          : `${process.execPath} ${path.join(__dirname, "..")}`;
        const desktopEntry = `[Desktop Entry]
Type=Application
Name=Screen Time Tracker
Exec=${execPath}
Icon=${appIconPath}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Comment=Track screen time usage
`;
        fs.writeFileSync(desktopPath, desktopEntry);
      } else {
        if (fs.existsSync(desktopPath)) fs.unlinkSync(desktopPath);
      }

      await setSetting("launch_on_login", String(payload.enabled));
      return ok();
    } catch (err) {
      return fail("AUTOSTART_ERROR", String(err));
    }
  });

  ipcMain.handle("system:trackerReady", () => {
    return ok({ ready: isActiveWinLoaded() });
  });

  ipcMain.handle("system:isFirstRun", async () => {
    const val = await getSetting("first_run_complete");
    return ok({ isFirstRun: val !== "true" });
  });

  ipcMain.handle("system:completeOnboarding", async () => {
    await setSetting("first_run_complete", "true");
    cachedSettings.first_run_complete = "true";
    return ok();
  });
}

// ─── Tray ────────────────────────────────────────────────────────────────────

let tray = null;

const activeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <circle cx="8" cy="8" r="7" fill="#4F46E5" stroke="#6366F1" stroke-width="1"/>
  <line x1="8" y1="8" x2="8" y2="4" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="8" y1="8" x2="11" y2="8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const pausedIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <circle cx="8" cy="8" r="7" fill="#92400E" stroke="#B45309" stroke-width="1"/>
  <line x1="6" y1="5" x2="6" y2="11" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="10" y1="5" x2="10" y2="11" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

function createTray() {
  const icon = nativeImage.createFromBuffer(Buffer.from(activeIconSvg));
  tray = new Tray(icon);
  updateTrayMenu();

  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

async function getTodaySummary() {
  try {
    const pool = getPool();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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

  const icon = nativeImage.createFromBuffer(
    Buffer.from(isPaused ? pausedIconSvg : activeIconSvg)
  );
  tray.setImage(icon);

  getTodaySummary().then((summaryItems) => {
    if (!tray) return;

    const summaryLabels = summaryItems.length > 0
      ? summaryItems.map((label) => ({ label, enabled: false }))
      : [{ label: "No data yet", enabled: false }];

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open Dashboard",
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow();
          }
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

  tray.setToolTip(isPaused ? "Screen Time Tracker (Paused)" : "Screen Time Tracker");
}

// ─── Window ──────────────────────────────────────────────────────────────────

let mainWindow = null;

// Cache settings for synchronous access during window creation
let cachedSettings = {};

async function createWindow() {
  const startMinimized =
    cachedSettings.start_minimized === "true" &&
    cachedSettings.first_run_complete === "true";

  // Build a multi-resolution icon for best Linux/X11 compatibility
  const iconDir = app.isPackaged
    ? path.join(process.resourcesPath, "assets", "icon")
    : path.join(__dirname, "..", "..", "assets", "icon");
  const iconSizes = ["16x16.png", "32x32.png", "48x48.png", "64x64.png", "128x128.png", "256x256.png", "512x512.png"];
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

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: !startMinimized,
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Explicitly set the icon after creation — ensures _NET_WM_ICON is set on X11
  mainWindow.setIcon(appIcon);

  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
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
app.name = "screen-time-tracker";
if (process.platform === "linux") {
  app.commandLine.appendSwitch("class", "screen-time-tracker");
}
app.setDesktopName("screen-time-tracker.desktop");

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
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
    const settingsResult = await getPool().query("SELECT key, value FROM settings");
    cachedSettings = {};
    for (const row of settingsResult.rows) {
      cachedSettings[row.key] = row.value;
    }

    registerIpcHandlers();
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
