const { getSetting } = require("../db");
const {
  startFocusSession,
  stopFocusSession,
  getFocusStatus: getStatus,
  getFocusHistory: getHistory,
} = require("../models/focus.engine");
const { ok, fail } = require("../utils/response");
const { isValidDateString } = require("../validators");

// ─── Focus Session Handlers ──────────────────────────────────────────────────

async function startFocus(_e, payload, _ctx) {
  try {
    let duration = payload?.durationMinutes;
    if (duration !== undefined && duration !== null) {
      duration = Number(duration);
      if (!Number.isInteger(duration) || duration < 1 || duration > 120) {
        return fail("INVALID_INPUT", "durationMinutes must be an integer between 1 and 120");
      }
    } else {
      duration = parseInt(getSetting("focus_session_duration_minutes"), 10) || 25;
    }
    const result = await startFocusSession(duration);
    return ok(result);
  } catch (err) {
    return fail("FOCUS_START_ERROR", String(err));
  }
}

async function stopFocus(_e, _payload, _ctx) {
  try {
    const result = await stopFocusSession();
    return ok(result);
  } catch (err) {
    return fail("FOCUS_STOP_ERROR", String(err));
  }
}

async function focusStatus(_e, _payload, _ctx) {
  try {
    return ok(getStatus());
  } catch (err) {
    return fail("FOCUS_STATUS_ERROR", String(err));
  }
}

async function focusHistory(_e, payload, _ctx) {
  try {
    if (!payload || !isValidDateString(payload.startDate) || !isValidDateString(payload.endDate)) {
      return fail("INVALID_INPUT", "startDate and endDate must be YYYY-MM-DD");
    }
    const history = await getHistory(payload.startDate, payload.endDate);
    return ok(history);
  } catch (err) {
    return fail("FOCUS_HISTORY_ERROR", String(err));
  }
}

module.exports = { startFocus, stopFocus, focusStatus, focusHistory };
