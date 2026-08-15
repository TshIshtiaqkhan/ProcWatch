const { powerMonitor } = require("electron");
const { getPool, getSetting } = require("../db");
const { logger } = require("../utils/logger");

let currentSession = null;
let pollTimer = null;
let isPaused = false;
let activeWinFn = null;

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

// ─── Session Merge Logic ─────────────────────────────────────────────────────

async function closeSession(endTime) {
  if (!currentSession) return;

  const pool = getPool();
  const start = new Date(currentSession.start_time).getTime();
  const end = new Date(endTime).getTime();
  const duration = Math.round((end - start) / 1000);

  if (currentSession.id) {
    await pool.query(
      "UPDATE sessions SET end_time = $1, duration_seconds = $2 WHERE id = $3",
      [endTime, duration, currentSession.id]
    );
  } else {
    const result = await pool.query(
      "INSERT INTO sessions (app_name, window_title, start_time, end_time, duration_seconds, is_idle) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [
        currentSession.app_name,
        currentSession.window_title,
        currentSession.start_time,
        endTime,
        duration,
        currentSession.is_idle,
      ]
    );
    currentSession.id = result.rows[0]?.id;
  }

  currentSession = null;
}

async function openSession(appName, windowTitle, startTime, isIdle) {
  const pool = getPool();
  const result = await pool.query(
    "INSERT INTO sessions (app_name, window_title, start_time, end_time, duration_seconds, is_idle) VALUES ($1, $2, $3, $3, 0, $4) RETURNING id",
    [appName, windowTitle, startTime, isIdle]
  );

  currentSession = {
    id: result.rows[0]?.id,
    app_name: appName,
    window_title: windowTitle,
    start_time: startTime,
    end_time: startTime,
    duration_seconds: 0,
    is_idle: isIdle,
  };
}

async function updateSessionEnd(endTime) {
  if (!currentSession || !currentSession.id) return;
  const pool = getPool();
  const start = new Date(currentSession.start_time).getTime();
  const end = new Date(endTime).getTime();
  const duration = Math.round((end - start) / 1000);
  await pool.query(
    "UPDATE sessions SET end_time = $1, duration_seconds = $2 WHERE id = $3",
    [endTime, duration, currentSession.id]
  );
  currentSession.end_time = endTime;
  currentSession.duration_seconds = duration;
}

// ─── Poll Loop ───────────────────────────────────────────────────────────────

async function pollActiveWindow() {
  if (isPaused) return;

  const now = new Date().toISOString();
  const idleSeconds = powerMonitor.getSystemIdleTime();
  const idleThreshold = parseInt(await getSetting("idle_threshold_seconds"), 10);

  try {
    if (idleSeconds >= idleThreshold) {
      // User is idle
      if (!currentSession || currentSession.is_idle === 0) {
        await closeSession(now);
        await openSession("Idle", null, now, 1);
      } else {
        // Still idle — update end_time so crash doesn't lose duration
        await updateSessionEnd(now);
      }
      return;
    }

    // User is active — get active window
    let activeWindow = null;
    if (activeWinFn) {
      try {
        activeWindow = await activeWinFn();
      } catch {
        // active-win threw (no window focused, X11 error, etc.) — skip this poll
        return;
      }
    }

    if (!activeWindow) {
      // No focused window — treat as idle
      if (!currentSession || currentSession.is_idle === 0) {
        await closeSession(now);
        await openSession("Idle", null, now, 1);
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
      await openSession(appName, windowTitle, now, 0);
    } else {
      // Same app+title as before — update end_time to prevent data loss on crash
      await updateSessionEnd(now);
    }
  } catch (err) {
    // Never crash the tracker loop
    logger.error("Poll error:", err);
  }
}

// ─── Start / Stop ────────────────────────────────────────────────────────────

async function startTracking() {
  if (pollTimer) return;

  const intervalSeconds = parseInt(await getSetting("polling_interval_seconds"), 10) || 5;
  const interval = intervalSeconds * 1000;

  pollTimer = setInterval(() => {
    pollActiveWindow().catch((err) => logger.error("Poll error:", err));
  }, interval);
}

async function stopTracking() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (currentSession) {
    await closeSession(new Date().toISOString());
  }
}

// ─── Power Monitor Integration ───────────────────────────────────────────────

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
      const now = new Date().toISOString();
      closeSession(now).catch((err) =>
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
};
