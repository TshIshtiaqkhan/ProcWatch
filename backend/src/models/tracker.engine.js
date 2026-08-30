const { powerMonitor } = require("electron");
const { getPool, getSetting } = require("../db");
const { logger } = require("../utils/logger");

let currentSession = null;
let pollTimer = null;
let isPaused = false;
let activeWinFn = null;

// Minimum duration a session must reach before it is written to the database.
// This prevents a write storm from rapid window switching and eliminates
// zero-duration orphan rows that accumulate on crash.
const MIN_SESSION_SECONDS = 3;

// ─── Settings Cache ───────────────────────────────────────────────────────────
//
// Reading idle_threshold_seconds from SQLite on every poll tick (default: every
// 5 s = 720 reads/hour) is wasteful for a value that almost never changes.
// Cache the values in memory and expose invalidateSettingsCache() so callers
// (e.g. updateSettings controller) can bust the cache when the user saves new
// preferences.

let _cachedIdleThreshold = null;
let _cachedIntervalMs = null;

function invalidateSettingsCache() {
  _cachedIdleThreshold = null;
  _cachedIntervalMs = null;
}

function getIdleThreshold() {
  if (_cachedIdleThreshold === null) {
    _cachedIdleThreshold = parseInt(getSetting("idle_threshold_seconds"), 10) || 90;
  }
  return _cachedIdleThreshold;
}

function getIntervalMs() {
  if (_cachedIntervalMs === null) {
    _cachedIntervalMs = (parseInt(getSetting("polling_interval_seconds"), 10) || 5) * 1000;
  }
  return _cachedIntervalMs;
}

// ─── Getters / Setters ────────────────────────────────────────────────────────

function setActiveWinFn(fn) {
  activeWinFn = fn;
}

function isActiveWinLoaded() {
  return activeWinFn !== null;
}

function getIsPaused() {
  return isPaused;
}

function setIsPaused(paused) {
  isPaused = paused;
}

function getCurrentSession() {
  return currentSession;
}

// ─── Session Lifecycle ────────────────────────────────────────────────────────
//
// Sessions are held in memory on openSession() and only written to the database
// once their duration exceeds MIN_SESSION_SECONDS (via updateSessionEnd) or when
// they close with a duration >= MIN_SESSION_SECONDS (via closeSession).
// Short-lived sessions (e.g. rapid Alt-Tab) are silently discarded.

function openSession(appName, windowTitle, startTime, isIdle) {
  // Synchronous — just set the in-memory record. No DB write yet.
  currentSession = {
    id: null, // null = not yet persisted
    app_name: appName,
    window_title: windowTitle,
    start_time: startTime,
    is_idle: isIdle,
    duration_seconds: 0,
  };
}

async function _persistSession() {
  if (!currentSession || currentSession.id) return;
  const pool = getPool();
  const result = await pool.query(
    "INSERT INTO sessions (app_name, window_title, start_time, end_time, duration_seconds, is_idle) VALUES ($1, $2, $3, $3, 0, $4) RETURNING id",
    [currentSession.app_name, currentSession.window_title, currentSession.start_time, currentSession.is_idle]
  );
  currentSession.id = result.rows[0]?.id;
}

async function closeSession(endTime) {
  if (!currentSession) return;

  const duration = Math.round(
    (new Date(endTime).getTime() - new Date(currentSession.start_time).getTime()) / 1000
  );

  if (duration < MIN_SESSION_SECONDS) {
    // Too short — discard without touching the database
    currentSession = null;
    return;
  }

  const pool = getPool();
  if (currentSession.id) {
    // Already persisted — just close it
    await pool.query(
      "UPDATE sessions SET end_time = $1, duration_seconds = $2 WHERE id = $3",
      [endTime, duration, currentSession.id]
    );
  } else {
    // Was never persisted (threshold just crossed at close time) — insert full record
    await pool.query(
      "INSERT INTO sessions (app_name, window_title, start_time, end_time, duration_seconds, is_idle) VALUES ($1, $2, $3, $4, $5, $6)",
      [currentSession.app_name, currentSession.window_title, currentSession.start_time, endTime, duration, currentSession.is_idle]
    );
  }

  currentSession = null;
}

async function updateSessionEnd(endTime) {
  if (!currentSession) return;

  const duration = Math.round(
    (new Date(endTime).getTime() - new Date(currentSession.start_time).getTime()) / 1000
  );

  // First time the session crosses the threshold — persist it
  if (!currentSession.id && duration >= MIN_SESSION_SECONDS) {
    await _persistSession();
  }

  // Update the live end_time (crash-recovery: DB always has a recent end_time)
  if (currentSession.id) {
    const pool = getPool();
    await pool.query(
      "UPDATE sessions SET end_time = $1, duration_seconds = $2 WHERE id = $3",
      [endTime, duration, currentSession.id]
    );
    currentSession.end_time = endTime;
    currentSession.duration_seconds = duration;
  }
}

// ─── Poll Loop ────────────────────────────────────────────────────────────────
//
// Uses recursive setTimeout instead of setInterval so that a slow poll
// (e.g. active-win hanging, temporary DB contention) does not cause the next
// tick to fire before the current one finishes, which would stack concurrent
// executions indefinitely on slow hardware.

async function pollActiveWindow() {
  if (isPaused) return;

  const now = new Date().toISOString();
  const idleSeconds = powerMonitor.getSystemIdleTime();
  const idleThreshold = getIdleThreshold(); // cached — no DB hit unless invalidated

  try {
    if (idleSeconds >= idleThreshold) {
      // ── User is idle ──
      if (!currentSession || currentSession.is_idle === 0) {
        await closeSession(now);
        openSession("Idle", null, now, 1);
      } else {
        await updateSessionEnd(now);
      }
      return;
    }

    // ── User is active — detect foreground window ──
    let activeWindow = null;
    if (activeWinFn) {
      try {
        activeWindow = await activeWinFn();
      } catch {
        // active-win threw (no window focused, X11 error, etc.) — skip this tick
        return;
      }
    }

    if (!activeWindow) {
      // No focused window — treat as idle
      if (!currentSession || currentSession.is_idle === 0) {
        await closeSession(now);
        openSession("Idle", null, now, 1);
      } else {
        await updateSessionEnd(now);
      }
      return;
    }

    const appName = activeWindow.owner.name;
    const windowTitle = activeWindow.title;

    if (
      !currentSession ||
      currentSession.is_idle === 1 ||
      currentSession.app_name !== appName ||
      currentSession.window_title !== windowTitle
    ) {
      await closeSession(now);
      openSession(appName, windowTitle, now, 0);
    } else {
      // Same app+title — keep updating end_time so a crash loses at most one interval
      await updateSessionEnd(now);
    }
  } catch (err) {
    // Never let an error crash the tracker loop
    logger.error("Poll error:", err);
  }
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────

async function startTracking() {
  if (pollTimer !== null) return;

  // Bust the settings cache so startTracking always picks up current DB values
  invalidateSettingsCache();
  // Prime the interval cache now (avoids an extra DB read in the first tick)
  const intervalMs = getIntervalMs();

  const tick = async () => {
    await pollActiveWindow().catch((err) => logger.error("Poll error:", err));
    // Only schedule the next tick if tracking is still active
    if (pollTimer !== null) {
      pollTimer = setTimeout(tick, intervalMs);
    }
  };

  pollTimer = setTimeout(tick, intervalMs);
}

async function stopTracking() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  if (currentSession) {
    await closeSession(new Date().toISOString());
  }
}

// ─── Power Monitor Integration ────────────────────────────────────────────────

function setupPowerMonitor() {
  powerMonitor.on("suspend", () => {
    if (currentSession) {
      closeSession(new Date().toISOString()).catch((err) =>
        logger.error("Error closing session on suspend:", err)
      );
    }
  });

  powerMonitor.on("resume", () => {
    currentSession = null;
  });

  powerMonitor.on("lock-screen", () => {
    if (currentSession && currentSession.is_idle === 0) {
      const now = new Date().toISOString();
      closeSession(now)
        .then(() => openSession("Idle", null, now, 1))
        .catch((err) => logger.error("Error on lock-screen:", err));
    }
  });

  powerMonitor.on("unlock-screen", () => {
    if (currentSession && currentSession.is_idle === 1) {
      closeSession(new Date().toISOString()).catch((err) =>
        logger.error("Error on unlock-screen:", err)
      );
    }
  });
}

module.exports = {
  setActiveWinFn,
  isActiveWinLoaded,
  getIsPaused,
  setIsPaused,
  getCurrentSession,
  startTracking,
  stopTracking,
  setupPowerMonitor,
  invalidateSettingsCache,
};
