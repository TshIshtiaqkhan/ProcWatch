const { dialog, app } = require("electron");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const { getPool, getSetting, setSetting, getAllSettings } = require("../db");
const {
  startTracking,
  stopTracking,
  getIsPaused,
  setIsPaused,
  getCurrentSession,
  isActiveWinLoaded,
} = require("../models");
const { DEFAULT_SETTINGS } = require("../configs");
const { formatDateString } = require("../utils/paths");
const { logger } = require("../utils/logger");
const { ok, fail } = require("../utils/response");
const { isValidDateString, isNonEmptyString } = require("../validators");

// ─── Usage queries ───────────────────────────────────────────────────────────

async function getToday(_e, _payload, _ctx) {
  try {
    const pool = getPool();
    const now = new Date();
    const today = formatDateString(now);

    const yesterdayObj = new Date(now);
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterday = formatDateString(yesterdayObj);

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

    const yesterdayActiveResult = await pool.query(
      `SELECT COALESCE(SUM(duration_seconds), 0) as seconds
       FROM sessions
       WHERE date(start_time, 'localtime') = $1 AND is_idle = 0`,
      [yesterday]
    );

    const yesterdayIdleResult = await pool.query(
      `SELECT COALESCE(SUM(duration_seconds), 0) as seconds
       FROM sessions
       WHERE date(start_time, 'localtime') = $1 AND is_idle = 1`,
      [yesterday]
    );

    return ok({
      apps: result.rows,
      idleSeconds: idleResult.rows[0]?.seconds ?? 0,
      yesterdayActiveSeconds: yesterdayActiveResult.rows[0]?.seconds ?? 0,
      yesterdayIdleSeconds: yesterdayIdleResult.rows[0]?.seconds ?? 0,
    });
  } catch (err) {
    return fail("QUERY_ERROR", String(err));
  }
}

async function getRange(_e, payload, _ctx) {
  try {
    if (!payload || typeof payload.startDate !== "string" || typeof payload.endDate !== "string") {
      return fail("INVALID_INPUT", "startDate and endDate are required strings");
    }
    if (!isValidDateString(payload.startDate) || !isValidDateString(payload.endDate)) {
      return fail("INVALID_INPUT", "Dates must be in YYYY-MM-DD format");
    }
    const pool = getPool();
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
}

async function getAppDetail(_e, payload, _ctx) {
  try {
    if (!payload || !isNonEmptyString(payload.appName)) {
      return fail("INVALID_INPUT", "appName is required");
    }
    if (!isValidDateString(payload.startDate) || !isValidDateString(payload.endDate)) {
      return fail("INVALID_INPUT", "startDate and endDate must be YYYY-MM-DD");
    }

    const pool = getPool();
    const appPattern = `%${payload.appName}%`;

    const dailyResult = await pool.query(
      `SELECT date(start_time, 'localtime') as date, SUM(duration_seconds) as seconds
       FROM sessions
       WHERE (LOWER(app_name) = LOWER($1) OR app_name LIKE $4) AND date(start_time, 'localtime') BETWEEN $2 AND $3 AND is_idle = 0
       GROUP BY date(start_time, 'localtime')
       ORDER BY date(start_time, 'localtime')`,
      [payload.appName, payload.startDate, payload.endDate, appPattern]
    );

    const titlesResult = await pool.query(
      `SELECT COALESCE(NULLIF(window_title, ''), app_name) as window_title, SUM(duration_seconds) as seconds
       FROM sessions
       WHERE (LOWER(app_name) = LOWER($1) OR app_name LIKE $4) AND date(start_time, 'localtime') BETWEEN $2 AND $3 AND is_idle = 0
       GROUP BY COALESCE(NULLIF(window_title, ''), app_name)
       ORDER BY seconds DESC`,
      [payload.appName, payload.startDate, payload.endDate, appPattern]
    );

    return ok({ daily: dailyResult.rows, titles: titlesResult.rows });
  } catch (err) {
    return fail("QUERY_ERROR", String(err));
  }
}

// ─── Tracking control ─────────────────────────────────────────────────────────

async function pauseTracking(_e, _payload, ctx) {
  try {
    if (getCurrentSession()) {
      await stopTracking();
    }
    setIsPaused(true);
    ctx.updateTrayMenu();
    return ok({ isPaused: true });
  } catch (err) {
    return fail("PAUSE_ERROR", String(err));
  }
}

async function resumeTracking(_e, _payload, ctx) {
  try {
    setIsPaused(false);
    await startTracking();
    ctx.updateTrayMenu();
    return ok({ isPaused: false });
  } catch (err) {
    return fail("RESUME_ERROR", String(err));
  }
}

function trackingStatus(_e, _payload, _ctx) {
  try {
    return ok({ isPaused: getIsPaused() });
  } catch (err) {
    return fail("STATUS_ERROR", String(err));
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

async function getSettings(_e, _payload, _ctx) {
  try {
    return ok(getAllSettings());
  } catch (err) {
    return fail("QUERY_ERROR", String(err));
  }
}

async function updateSettings(_e, payload, ctx) {
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
    const pool = getPool();
    for (const [key, value] of Object.entries(payload)) {
      ctx.getCachedSettings()[key] = value;
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
}

// ─── Data export / clear ──────────────────────────────────────────────────────

async function exportData(_e, payload, ctx) {
  try {
    if (!payload || (payload.format !== "csv" && payload.format !== "json")) {
      return fail("INVALID_INPUT", "Format must be 'csv' or 'json'");
    }
    const pool = getPool();
    const result = await pool.query("SELECT * FROM sessions ORDER BY start_time");
    const rows = result.rows;

    const filters =
      payload.format === "csv"
        ? [{ name: "CSV", extensions: ["csv"] }]
        : [{ name: "JSON", extensions: ["json"] }];

    const win = ctx.getMainWindow();
    const dialogResult = win
      ? await dialog.showSaveDialog(win, {
          title: "Export Data",
          defaultPath: `procwatch-data.${payload.format}`,
          filters,
        })
      : await dialog.showSaveDialog({
          title: "Export Data",
          defaultPath: `procwatch-data.${payload.format}`,
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
}

async function clearAllData(_e, _payload, _ctx) {
  try {
    const pool = getPool();
    logger.warn("CRITICAL: User triggered data:clearAll. Purging all tracking sessions!");
    await pool.query("DELETE FROM sessions");
    return ok();
  } catch (err) {
    return fail("CLEAR_ERROR", String(err));
  }
}

// ─── Categories ───────────────────────────────────────────────────────────────

async function listCategories(_e, _payload, _ctx) {
  try {
    const pool = getPool();
    const result = await pool.query(
      "SELECT app_name, category, is_distracting FROM app_categories ORDER BY app_name"
    );
    return ok(result.rows);
  } catch (err) {
    return fail("QUERY_ERROR", String(err));
  }
}

async function updateCategory(_e, payload, _ctx) {
  try {
    if (!payload || !isNonEmptyString(payload.appName) || !isNonEmptyString(payload.category)) {
      return fail("INVALID_INPUT", "appName and category are required non-empty strings");
    }
    const pool = getPool();
    const isDistracting = payload.isDistracting === true ? 1 : 0;
    await pool.query(
      "INSERT INTO app_categories (app_name, category, is_distracting) VALUES ($1, $2, $3) ON CONFLICT (app_name) DO UPDATE SET category = $2, is_distracting = $3",
      [payload.appName, payload.category, isDistracting]
    );
    return ok();
  } catch (err) {
    return fail("UPDATE_ERROR", String(err));
  }
}

async function removeCategory(_e, payload, _ctx) {
  try {
    if (!payload || !isNonEmptyString(payload.appName)) {
      return fail("INVALID_INPUT", "appName is required");
    }
    const pool = getPool();
    await pool.query("DELETE FROM app_categories WHERE app_name = $1", [payload.appName]);
    return ok();
  } catch (err) {
    return fail("DELETE_ERROR", String(err));
  }
}

// ─── System ───────────────────────────────────────────────────────────────────

async function checkDeps(_e, _payload, _ctx) {
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
}

async function setAutoStart(_e, payload, ctx) {
  try {
    if (!payload || typeof payload.enabled !== "boolean") {
      return fail("INVALID_INPUT", "enabled must be a boolean");
    }
    const autoStartDir = path.join(
      process.env.XDG_CONFIG_HOME || path.join(app.getPath("home"), ".config"),
      "autostart"
    );
    fs.mkdirSync(autoStartDir, { recursive: true });
    const desktopPath = path.join(autoStartDir, "procwatch.desktop");
    const oldDesktopPath = path.join(autoStartDir, "screen-time-tracker.desktop");
    if (fs.existsSync(oldDesktopPath)) {
      try { fs.unlinkSync(oldDesktopPath); } catch {}
    }

    if (payload.enabled) {
      // Use realpath to resolve any symlinks/case issues
      const execPath = app.isPackaged
        ? fs.realpathSync(app.getPath("exe"))
        : `${fs.realpathSync(process.execPath)} ${path.resolve(__dirname, "..", "..")}`;
      const iconPath = fs.existsSync(ctx.appIconPath) ? fs.realpathSync(ctx.appIconPath) : ctx.appIconPath;
      const desktopEntry = `[Desktop Entry]
Type=Application
Name=ProcWatch
Exec=${execPath} --no-sandbox
Icon=${iconPath}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Comment=ProcWatch Application Usage & Productivity Tracker
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
}

function trackerReady(_e, _payload, _ctx) {
  return ok({ ready: isActiveWinLoaded() });
}

async function isFirstRun(_e, _payload, _ctx) {
  const val = await getSetting("first_run_complete");
  return ok({ isFirstRun: val !== "true" });
}

async function completeOnboarding(_e, _payload, ctx) {
  try {
    await setSetting("first_run_complete", "true");
    if (ctx && typeof ctx.getCachedSettings === "function") {
      const cached = ctx.getCachedSettings();
      if (cached) cached.first_run_complete = "true";
    }
    return ok();
  } catch (err) {
    logger.error("Failed to complete onboarding:", err);
    return fail("ONBOARDING_ERROR", String(err));
  }
}

module.exports = {
  getToday,
  getRange,
  getAppDetail,
  pauseTracking,
  resumeTracking,
  trackingStatus,
  getSettings,
  updateSettings,
  exportData,
  clearAllData,
  listCategories,
  updateCategory,
  removeCategory,
  checkDeps,
  setAutoStart,
  trackerReady,
  isFirstRun,
  completeOnboarding,
};
