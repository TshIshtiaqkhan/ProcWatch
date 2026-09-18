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
  invalidateSettingsCache,
} = require("../models");
const { DEFAULT_SETTINGS } = require("../configs");
const { formatDateString } = require("../utils/paths");
const { logger } = require("../utils/logger");
const { ok, fail } = require("../utils/response");
const { isValidDateString, isNonEmptyString, sanitizeLikePattern, isValidSettingValue } = require("../validators");

// ─── Usage Queries ────────────────────────────────────────────────────────────

async function getToday(_e, _payload, _ctx) {
  try {
    const pool = getPool();
    const now = new Date();
    const today = formatDateString(now);

    const yesterdayObj = new Date(now);
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterday = formatDateString(yesterdayObj);

    // Run all four independent reads in parallel — previously sequential, now ~4× faster.
    // Uses the date_local indexed column (migration v3) instead of date(start_time, 'localtime')
    // which defeated the B-tree index on every query.
    const [result, idleResult, yesterdayActiveResult, yesterdayIdleResult] = await Promise.all([
      pool.query(
        `SELECT app_name, SUM(duration_seconds) as seconds
         FROM sessions
         WHERE date_local = $1 AND is_idle = 0
         GROUP BY app_name
         ORDER BY seconds DESC`,
        [today]
      ),
      pool.query(
        `SELECT COALESCE(SUM(duration_seconds), 0) as seconds
         FROM sessions
         WHERE date_local = $1 AND is_idle = 1`,
        [today]
      ),
      pool.query(
        `SELECT COALESCE(SUM(duration_seconds), 0) as seconds
         FROM sessions
         WHERE date_local = $1 AND is_idle = 0`,
        [yesterday]
      ),
      pool.query(
        `SELECT COALESCE(SUM(duration_seconds), 0) as seconds
         FROM sessions
         WHERE date_local = $1 AND is_idle = 1`,
        [yesterday]
      ),
    ]);

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

async function getPauseSummary(_e, _payload, _ctx) {
  try {
    const pool = getPool();
    const today = formatDateString(new Date());
    const result = await pool.query(
      `SELECT app_name, SUM(duration_seconds) as seconds
       FROM sessions
       WHERE date_local = $1 AND is_idle = 0
       GROUP BY app_name
       ORDER BY seconds DESC
       LIMIT 8`,
      [today]
    );

    const rows = result.rows || [];
    const totalSeconds = rows.reduce((sum, r) => sum + (r.seconds || 0), 0);
    const now = new Date();
    const pausedAt = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const dateFormatted = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const summary = rows.map((r, idx) => ({
      rank: idx + 1,
      app_name: r.app_name,
      seconds: r.seconds,
      percent: totalSeconds > 0 ? parseFloat(((r.seconds / totalSeconds) * 100).toFixed(1)) : 0,
    }));

    return ok({
      totalSeconds,
      appCount: rows.length,
      pausedAt,
      dateFormatted,
      apps: summary,
    });
  } catch (err) {
    logger.error("getPauseSummary error:", err);
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
      `SELECT date_local as date, app_name, SUM(duration_seconds) as seconds
       FROM sessions
       WHERE date_local BETWEEN $1 AND $2 AND is_idle = 0
       GROUP BY date_local, app_name
       ORDER BY date_local, seconds DESC`,
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
    // Escape special SQL LIKE wildcard characters (%, _, \) to prevent wildcard injection
    const sanitizedAppName = sanitizeLikePattern(payload.appName);
    const appPattern = `%${sanitizedAppName}%`;

    const [dailyResult, titlesResult] = await Promise.all([
      pool.query(
        `SELECT date_local as date, SUM(duration_seconds) as seconds
         FROM sessions
         WHERE (LOWER(app_name) = LOWER($1) OR app_name LIKE $4 ESCAPE '\\')
           AND date_local BETWEEN $2 AND $3
           AND is_idle = 0
         GROUP BY date_local
         ORDER BY date_local`,
        [payload.appName, payload.startDate, payload.endDate, appPattern]
      ),
      pool.query(
        `SELECT COALESCE(NULLIF(window_title, ''), app_name) as window_title,
                SUM(duration_seconds) as seconds
         FROM sessions
         WHERE (LOWER(app_name) = LOWER($1) OR app_name LIKE $4 ESCAPE '\\')
           AND date_local BETWEEN $2 AND $3
           AND is_idle = 0
         GROUP BY COALESCE(NULLIF(window_title, ''), app_name)
         ORDER BY seconds DESC`,
        [payload.appName, payload.startDate, payload.endDate, appPattern]
      ),
    ]);

    return ok({ daily: dailyResult.rows, titles: titlesResult.rows });
  } catch (err) {
    return fail("QUERY_ERROR", String(err));
  }
}

// ─── Tracking Control ─────────────────────────────────────────────────────────

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
    for (const [key, value] of Object.entries(payload)) {
      if (!allowedKeys.has(key)) {
        return fail("INVALID_INPUT", `Unknown setting key: ${key}`);
      }
      if (!isValidSettingValue(key, value)) {
        return fail("INVALID_INPUT", `Invalid value for setting: ${key}`);
      }
    }

    const pool = getPool();
    for (const [key, value] of Object.entries(payload)) {
      const stringVal = String(value);
      if (ctx && typeof ctx.getCachedSettings === "function") {
        const cached = ctx.getCachedSettings();
        if (cached) cached[key] = stringVal;
      }
      await pool.query(
        "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        [key, stringVal]
      );
    }

    // Bust the tracker settings cache so the new values are picked up on the
    // next poll tick without a DB read for every subsequent tick.
    invalidateSettingsCache();

    // If the polling interval changed, restart the timer with the new interval
    if ("polling_interval_seconds" in payload && !getIsPaused()) {
      await stopTracking();
      await startTracking();
    }

    return ok();
  } catch (err) {
    return fail("UPDATE_ERROR", String(err));
  }
}

// ─── Data Export / Clear ──────────────────────────────────────────────────────

async function exportData(_e, payload, ctx) {
  try {
    if (!payload || (payload.format !== "csv" && payload.format !== "json")) {
      return fail("INVALID_INPUT", "Format must be 'csv' or 'json'");
    }

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

    const pool = getPool();

    // Stream rows through better-sqlite3's iterator instead of loading the
    // entire sessions table into memory — prevents OOM on large datasets.
    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(dialogResult.filePath);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);

      try {
        const iterator = pool.iterate("SELECT * FROM sessions ORDER BY start_time");

        if (payload.format === "json") {
          writeStream.write("[\n");
          let first = true;
          for (const row of iterator) {
            if (!first) writeStream.write(",\n");
            writeStream.write("  " + JSON.stringify(row));
            first = false;
          }
          writeStream.write("\n]\n");
        } else {
          let keys = null;
          for (const row of iterator) {
            if (!keys) {
              keys = Object.keys(row);
              writeStream.write(keys.join(",") + "\n");
            }
            writeStream.write(keys.map((k) => JSON.stringify(row[k] ?? "")).join(",") + "\n");
          }
        }

        writeStream.end();
      } catch (iterErr) {
        reject(iterErr);
      }
    });

    return ok({ path: dialogResult.filePath });
  } catch (err) {
    return fail("EXPORT_ERROR", String(err));
  }
}

async function clearAllData(_e, payload, _ctx) {
  try {
    // Require a backend-side confirmation token so a compromised renderer
    // cannot delete data by calling the IPC channel directly with no validation.
    if (!payload || payload.confirmationToken !== "DELETE") {
      return fail(
        "UNAUTHORIZED",
        "Confirmation token required: pass { confirmationToken: 'DELETE' }"
      );
    }
    const pool = getPool();
    logger.warn("CRITICAL: User triggered data:clearAll — purging all tracking sessions.");
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
    // Return all categories, PLUS any distinct app_name recorded in sessions
    const result = await pool.query(
      `SELECT
         COALESCE(c.app_name, s.app_name) as app_name,
         COALESCE(c.category, 'Uncategorized') as category,
         COALESCE(c.is_distracting, 0) as is_distracting
       FROM (
         SELECT DISTINCT app_name FROM sessions WHERE is_idle = 0
         UNION
         SELECT app_name FROM app_categories
       ) s
       LEFT JOIN app_categories c ON LOWER(c.app_name) = LOWER(s.app_name)
       ORDER BY app_name`
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

    // Keep common aliases in sync so tracking never misses across desktop environments
    const lower = payload.appName.toLowerCase();
    let aliases = [];
    if (lower === "google-chrome" || lower === "google-chrome-stable" || lower === "chrome") {
      aliases = ["Google-chrome", "google-chrome", "google-chrome-stable", "chrome"];
    } else if (lower === "whatsapp" || lower === "whatsapp-linux-app") {
      aliases = ["whatsapp-linux-app", "whatsapp"];
    }

    for (const alias of aliases) {
      if (alias !== payload.appName) {
        await pool.query(
          "INSERT INTO app_categories (app_name, category, is_distracting) VALUES ($1, $2, $3) ON CONFLICT (app_name) DO UPDATE SET category = $2, is_distracting = $3",
          [alias, payload.category, isDistracting]
        );
      }
    }

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
      const execPath = app.isPackaged
        ? fs.realpathSync(app.getPath("exe"))
        : `${fs.realpathSync(process.execPath)} ${path.resolve(__dirname, "..", "..")}`;
      const iconPath = fs.existsSync(ctx.appIconPath)
        ? fs.realpathSync(ctx.appIconPath)
        : ctx.appIconPath;
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
  const val = getSetting("first_run_complete");
  return ok({ isFirstRun: val !== "true" });
}

async function completeOnboarding(_e, _payload, ctx) {
  try {
    setSetting("first_run_complete", "true");
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
  getPauseSummary,
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
