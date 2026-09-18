const { getPool, getSetting } = require("../db");
const { logger } = require("../utils/logger");

let mainWindow = null;
let focusState = "idle"; // 'idle' | 'running'
let currentFocus = null; // { id, startedAt, durationMinutes, distractions, endsAt }
let completionTimer = null;
let lastDistractingApp = null; // track to avoid counting repeated polls of same app

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

// ─── Getters ──────────────────────────────────────────────────────────────────

function getActiveFocusSession() {
  return focusState === "running" ? currentFocus : null;
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────

async function startFocusSession(durationMinutes) {
  if (focusState === "running") {
    throw new Error("A focus session is already running");
  }

  const duration = durationMinutes || parseInt(getSetting("focus_session_duration_minutes"), 10) || 25;
  const now = new Date();
  const endsAt = new Date(now.getTime() + duration * 60 * 1000);

  const pool = getPool();
  const result = await pool.query(
    "INSERT INTO focus_sessions (start_time, duration_minutes) VALUES ($1, $2)",
    [now.toISOString(), duration]
  );

  const sessionId = Number(result.lastInsertRowid);

  currentFocus = {
    id: sessionId,
    startedAt: now.toISOString(),
    durationMinutes: duration,
    distractions: 0,
    endsAt: endsAt.toISOString(),
  };

  focusState = "running";
  lastDistractingApp = null;

  // Set completion timer
  completionTimer = setTimeout(() => {
    _completeSession().catch((err) =>
      logger.error("Error completing focus session:", err)
    );
  }, duration * 60 * 1000);

  logger.info(`Focus session started: ${duration}min, id=${sessionId}`);

  return { sessionId, endsAt: endsAt.toISOString() };
}

async function _completeSession() {
  if (!currentFocus) return;

  const now = new Date().toISOString();
  const pool = getPool();

  await pool.query(
    "UPDATE focus_sessions SET end_time = $1, completed = 1, distractions = $2 WHERE id = $3",
    [now, currentFocus.distractions, currentFocus.id]
  );

  const durationSeconds = Math.round(
    (Date.now() - new Date(currentFocus.startedAt).getTime()) / 1000
  );

  const result = {
    completed: true,
    distractions: currentFocus.distractions,
    durationSeconds,
  };

  logger.info(`Focus session completed: id=${currentFocus.id}, distractions=${currentFocus.distractions}`);

  focusState = "idle";
  currentFocus = null;
  lastDistractingApp = null;

  // Notify renderer
  const win = getActiveWindow();
  if (win) {
    win.webContents.send("focus:completed", result);
  }

  return result;
}

async function stopFocusSession() {
  if (focusState !== "running" || !currentFocus) {
    return { completed: false, distractions: 0, durationSeconds: 0 };
  }

  if (completionTimer) {
    clearTimeout(completionTimer);
    completionTimer = null;
  }

  const now = new Date().toISOString();
  const durationSeconds = Math.round(
    (Date.now() - new Date(currentFocus.startedAt).getTime()) / 1000
  );
  const pool = getPool();

  await pool.query(
    "UPDATE focus_sessions SET end_time = $1, completed = 0, distractions = $2 WHERE id = $3",
    [now, currentFocus.distractions, currentFocus.id]
  );

  const result = {
    completed: false,
    distractions: currentFocus.distractions,
    durationSeconds,
  };

  logger.info(`Focus session cancelled: id=${currentFocus.id}`);

  focusState = "idle";
  currentFocus = null;
  lastDistractingApp = null;

  return result;
}

// ─── Status ───────────────────────────────────────────────────────────────────

function getFocusStatus() {
  if (focusState !== "running" || !currentFocus) {
    return { state: "idle", remainingSeconds: 0, distractions: 0, startedAt: null, durationMinutes: 0, sessionId: null };
  }

  const remaining = Math.max(
    0,
    Math.round((new Date(currentFocus.endsAt).getTime() - Date.now()) / 1000)
  );

  return {
    state: "running",
    remainingSeconds: remaining,
    distractions: currentFocus.distractions,
    startedAt: currentFocus.startedAt,
    durationMinutes: currentFocus.durationMinutes,
    sessionId: currentFocus.id,
  };
}

// ─── History ──────────────────────────────────────────────────────────────────

async function getFocusHistory(startDate, endDate) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT
       date(start_time, 'localtime') as date,
       COUNT(*) as sessions,
       COALESCE(SUM(duration_minutes), 0) as totalMinutes,
       COALESCE(SUM(distractions), 0) as totalDistractions,
       COALESCE(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END), 0) as completedCount
     FROM focus_sessions
     WHERE start_time >= $1 AND start_time < date($2, '+1 day')
     GROUP BY date(start_time, 'localtime')
     ORDER BY date`,
    [startDate, endDate]
  );

  return result.rows;
}

// ─── Distraction Detection ────────────────────────────────────────────────────

async function checkDistraction(appName) {
  if (focusState !== "running" || !currentFocus) {
    return { isDistraction: false };
  }

  const normalizedApp = (appName || "").toLowerCase();
  const normalizedLast = (lastDistractingApp || "").toLowerCase();

  // Only count a new distraction when the user switches TO a distracting app,
  // not on every subsequent poll tick while they remain on it.
  if (normalizedApp === normalizedLast) {
    return { isDistraction: false };
  }

  const pool = getPool();
  // Check if appName is marked distracting, with flexible alias and prefix matching
  const result = await pool.query(
    `SELECT app_name, is_distracting FROM app_categories
     WHERE is_distracting = 1
       AND (
         LOWER(app_name) = LOWER($1)
         OR LOWER($1) LIKE '%' || LOWER(app_name) || '%'
         OR LOWER(app_name) LIKE '%' || LOWER($1) || '%'
         OR REPLACE(REPLACE(LOWER($1), '-stable', ''), '-linux-app', '') =
            REPLACE(REPLACE(LOWER(app_name), '-stable', ''), '-linux-app', '')
       )
     LIMIT 1`,
    [appName]
  );

  const row = result.rows[0];
  if (!row || !row.is_distracting) {
    // User switched to a non-distracting app — reset the tracker
    lastDistractingApp = null;
    return { isDistraction: false };
  }

  // New distracting app switch detected
  lastDistractingApp = appName;
  currentFocus.distractions += 1;

  // Update DB
  await pool.query(
    "UPDATE focus_sessions SET distractions = $1 WHERE id = $2",
    [currentFocus.distractions, currentFocus.id]
  );

  // Notify renderer
  const win = getActiveWindow();
  if (win) {
    win.webContents.send("focus:distraction", {
      appName,
      distractions: currentFocus.distractions,
    });
  }

  logger.info(`Focus distraction #${currentFocus.distractions}: ${appName} (matched rule: ${row.app_name})`);

  return { isDistraction: true, appName };
}

module.exports = {
  setMainWindow,
  getActiveFocusSession,
  startFocusSession,
  stopFocusSession,
  getFocusStatus,
  getFocusHistory,
  checkDistraction,
};
