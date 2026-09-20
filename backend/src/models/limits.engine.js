const { Notification } = require("electron");
const { getPool } = require("../db");
const { logger } = require("../utils/logger");
const { formatDateString, resolveAssetPath } = require("../utils/paths");

let mainWindow = null;

// In-memory cache of configured active limits: Map<appName, { id, limitMinutes, warnAtPercent, isEnabled }>
let limitsCache = null;

// Daily notification state: Map<appName, { warned: boolean, exceeded: boolean }>
const alertedToday = new Map();
let currentDateStr = "";

// ─── Window Reference ─────────────────────────────────────────────────────────

function setMainWindow(win) {
  mainWindow = win;
}

function getActiveWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  try {
    const { BrowserWindow } = require("electron");
    const wins = BrowserWindow.getAllWindows();
    return wins.length > 0 && !wins[0].isDestroyed() ? wins[0] : null;
  } catch {
    return null;
  }
}

function notifyRenderer(event, data) {
  const win = getActiveWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(event, data);
  }
}

// ─── Cache Management ─────────────────────────────────────────────────────────

function getTodayDateStr() {
  return formatDateString(new Date());
}

function ensureDayRollover() {
  const today = getTodayDateStr();
  if (currentDateStr !== today) {
    currentDateStr = today;
    alertedToday.clear();
    logger.info(`App limits daily tracking reset for new day: ${today}`);
  }
  return today;
}

async function refreshLimitsCache() {
  try {
    const pool = getPool();
    const result = await pool.query(
      "SELECT id, app_name, limit_minutes, warn_at_percent, is_enabled FROM app_limits WHERE is_enabled = 1"
    );
    const map = new Map();
    for (const row of result.rows) {
      map.set(row.app_name.toLowerCase(), {
        id: row.id,
        appName: row.app_name,
        limitMinutes: row.limit_minutes,
        warnAtPercent: row.warn_at_percent ?? 80,
        isEnabled: Boolean(row.is_enabled),
      });
    }
    limitsCache = map;
    return limitsCache;
  } catch (err) {
    logger.error("Error refreshing limits cache:", err.message);
    return new Map();
  }
}

function invalidateLimitsCache() {
  limitsCache = null;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all configured limits merged with today's actual accumulated usage.
 */
async function getAllLimitsWithUsage() {
  ensureDayRollover();
  const pool = getPool();
  const today = getTodayDateStr();

  // 1. Fetch all limits
  const limitsRes = await pool.query(
    "SELECT id, app_name, limit_minutes, warn_at_percent, is_enabled, created_at, updated_at FROM app_limits ORDER BY app_name ASC"
  );

  // 2. Fetch today's usage by app
  const usageRes = await pool.query(
    "SELECT app_name, SUM(duration_seconds) as total_seconds FROM sessions WHERE date_local = $1 AND is_idle = 0 GROUP BY app_name",
    [today]
  );

  const usageMap = new Map();
  for (const row of usageRes.rows) {
    usageMap.set(row.app_name.toLowerCase(), Number(row.total_seconds) || 0);
  }

  // 3. Merge
  return limitsRes.rows.map((limit) => {
    const key = limit.app_name.toLowerCase();
    const todaySeconds = usageMap.get(key) || 0;
    const limitSeconds = limit.limit_minutes * 60;
    const warnPercent = limit.warn_at_percent || 80;
    const percentUsed = limitSeconds > 0 ? Math.min(100, Math.round((todaySeconds / limitSeconds) * 100)) : 0;
    const isWarned = percentUsed >= warnPercent;
    const isExceeded = todaySeconds >= limitSeconds;

    return {
      id: limit.id,
      appName: limit.app_name,
      limitMinutes: limit.limit_minutes,
      warnAtPercent: warnPercent,
      isEnabled: Boolean(limit.is_enabled),
      todaySeconds,
      percentUsed,
      isWarned,
      isExceeded,
      createdAt: limit.created_at,
      updatedAt: limit.updated_at,
    };
  });
}

// ─── Mutators ─────────────────────────────────────────────────────────────────

async function upsertLimit(appName, limitMinutes, warnAtPercent = 80, isEnabled = true) {
  if (!appName || typeof appName !== "string") {
    throw new Error("appName must be a non-empty string");
  }
  const cleanName = appName.trim();
  const mins = Number(limitMinutes);
  if (!Number.isInteger(mins) || mins <= 0 || mins > 1440) {
    throw new Error("limitMinutes must be an integer between 1 and 1440 (24 hours)");
  }
  const warnPct = Number(warnAtPercent);
  if (!Number.isInteger(warnPct) || warnPct < 10 || warnPct > 100) {
    throw new Error("warnAtPercent must be an integer between 10 and 100");
  }

  const pool = getPool();
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO app_limits (app_name, limit_minutes, warn_at_percent, is_enabled, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $5)
     ON CONFLICT(app_name) DO UPDATE SET
       limit_minutes = excluded.limit_minutes,
       warn_at_percent = excluded.warn_at_percent,
       is_enabled = excluded.is_enabled,
       updated_at = excluded.updated_at`,
    [cleanName, mins, warnPct, isEnabled ? 1 : 0, now]
  );

  invalidateLimitsCache();
  notifyRenderer("limits:updated");
  logger.info(`App limit configured: ${cleanName} -> ${mins}m (warn at ${warnPct}%)`);
  return { success: true };
}

async function deleteLimit(appName) {
  if (!appName || typeof appName !== "string") {
    throw new Error("appName must be a non-empty string");
  }
  const pool = getPool();
  await pool.query("DELETE FROM app_limits WHERE app_name = $1", [appName.trim()]);
  invalidateLimitsCache();
  notifyRenderer("limits:updated");
  logger.info(`App limit deleted for: ${appName}`);
  return { success: true };
}

async function toggleLimit(appName, isEnabled) {
  if (!appName || typeof appName !== "string") {
    throw new Error("appName must be a non-empty string");
  }
  const pool = getPool();
  const now = new Date().toISOString();
  await pool.query(
    "UPDATE app_limits SET is_enabled = $1, updated_at = $2 WHERE app_name = $3",
    [isEnabled ? 1 : 0, now, appName.trim()]
  );
  invalidateLimitsCache();
  notifyRenderer("limits:updated");
  logger.info(`App limit toggled: ${appName} -> ${isEnabled ? "enabled" : "disabled"}`);
  return { success: true };
}

// ─── Notification Dispatcher ──────────────────────────────────────────────────

function formatFriendlyMinutes(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function sendDesktopNotification(title, body) {
  try {
    const iconPath = resolveAssetPath("assets", "icon", "256x256.png");
    if (Notification.isSupported()) {
      const notif = new Notification({
        title,
        body,
        icon: iconPath,
        silent: false,
      });
      notif.show();
    }
  } catch (err) {
    logger.error("Failed to display desktop notification:", err.message);
  }
}

// ─── Tracking Engine Tick Check ───────────────────────────────────────────────

/**
 * Called on each tracker polling cycle when an app window is active.
 * Checks if the app has an active limit and triggers notifications when crossing thresholds.
 */
async function checkAppLimit(appName) {
  if (!appName || typeof appName !== "string") return;

  ensureDayRollover();

  if (limitsCache === null) {
    await refreshLimitsCache();
  }

  const key = appName.toLowerCase();
  const limit = limitsCache.get(key);
  if (!limit || !limit.isEnabled) return;

  const today = getTodayDateStr();
  const pool = getPool();

  // Query today's accumulated duration for this specific app
  const res = await pool.query(
    "SELECT SUM(duration_seconds) as total_seconds FROM sessions WHERE date_local = $1 AND app_name = $2 AND is_idle = 0",
    [today, limit.appName]
  );

  const usedSeconds = Number(res.rows[0]?.total_seconds) || 0;
  const limitSeconds = limit.limitMinutes * 60;
  const warnSeconds = Math.round((limitSeconds * limit.warnAtPercent) / 100);

  if (!alertedToday.has(key)) {
    alertedToday.set(key, { warned: false, exceeded: false });
  }
  const alertState = alertedToday.get(key);

  // 1. Exceeded threshold check (100%)
  if (usedSeconds >= limitSeconds && !alertState.exceeded) {
    alertState.exceeded = true;
    alertState.warned = true; // Mark warned as well to avoid trailing warnings
    const limitLabel = formatFriendlyMinutes(limit.limitMinutes);
    sendDesktopNotification(
      `Daily Limit Reached: ${limit.appName}`,
      `You've reached your ${limitLabel} daily limit for ${limit.appName}.`
    );
    notifyRenderer("limits:exceeded", {
      appName: limit.appName,
      usedSeconds,
      limitMinutes: limit.limitMinutes,
      threshold: "exceeded",
    });
    logger.info(`App limit EXCEEDED alert sent for ${limit.appName} (${usedSeconds}s / ${limitSeconds}s)`);
    return;
  }

  // 2. Warning threshold check (default 80%)
  if (usedSeconds >= warnSeconds && !alertState.warned) {
    alertState.warned = true;
    const limitLabel = formatFriendlyMinutes(limit.limitMinutes);
    sendDesktopNotification(
      `Usage Alert: ${limit.appName}`,
      `You've used ${limit.warnAtPercent}% of your ${limitLabel} daily limit for ${limit.appName}.`
    );
    notifyRenderer("limits:warning", {
      appName: limit.appName,
      usedSeconds,
      limitMinutes: limit.limitMinutes,
      threshold: "warning",
    });
    logger.info(`App limit WARNING alert sent for ${limit.appName} (${usedSeconds}s / ${limitSeconds}s)`);
  }
}

module.exports = {
  setMainWindow,
  getAllLimitsWithUsage,
  upsertLimit,
  deleteLimit,
  toggleLimit,
  checkAppLimit,
  refreshLimitsCache,
  invalidateLimitsCache,
};
