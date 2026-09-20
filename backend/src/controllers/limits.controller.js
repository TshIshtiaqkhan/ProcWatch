const {
  getAllLimitsWithUsage,
  upsertLimit,
  deleteLimit,
  toggleLimit,
} = require("../models/limits.engine");
const { ok, fail } = require("../utils/response");

// ─── App Limits Handlers ──────────────────────────────────────────────────────

async function getLimits(_e, _payload, _ctx) {
  try {
    const limits = await getAllLimitsWithUsage();
    return ok(limits);
  } catch (err) {
    return fail("LIMITS_FETCH_ERROR", String(err.message || err));
  }
}

async function setLimit(_e, payload, _ctx) {
  try {
    if (!payload || !payload.appName || typeof payload.appName !== "string") {
      return fail("INVALID_INPUT", "appName is required and must be a string");
    }
    const mins = Number(payload.limitMinutes);
    if (!Number.isInteger(mins) || mins <= 0 || mins > 1440) {
      return fail("INVALID_INPUT", "limitMinutes must be an integer between 1 and 1440 (24 hours)");
    }
    const warnAt = payload.warnAtPercent !== undefined ? Number(payload.warnAtPercent) : 80;
    if (!Number.isInteger(warnAt) || warnAt < 10 || warnAt > 100) {
      return fail("INVALID_INPUT", "warnAtPercent must be an integer between 10 and 100");
    }
    const isEnabled = payload.isEnabled !== undefined ? Boolean(payload.isEnabled) : true;

    const result = await upsertLimit(payload.appName, mins, warnAt, isEnabled);
    return ok(result);
  } catch (err) {
    return fail("LIMITS_SET_ERROR", String(err.message || err));
  }
}

async function removeLimit(_e, payload, _ctx) {
  try {
    if (!payload || !payload.appName || typeof payload.appName !== "string") {
      return fail("INVALID_INPUT", "appName is required and must be a string");
    }
    const result = await deleteLimit(payload.appName);
    return ok(result);
  } catch (err) {
    return fail("LIMITS_DELETE_ERROR", String(err.message || err));
  }
}

async function toggleLimitStatus(_e, payload, _ctx) {
  try {
    if (!payload || !payload.appName || typeof payload.appName !== "string") {
      return fail("INVALID_INPUT", "appName is required and must be a string");
    }
    if (payload.isEnabled === undefined) {
      return fail("INVALID_INPUT", "isEnabled boolean is required");
    }
    const result = await toggleLimit(payload.appName, Boolean(payload.isEnabled));
    return ok(result);
  } catch (err) {
    return fail("LIMITS_TOGGLE_ERROR", String(err.message || err));
  }
}

module.exports = {
  getLimits,
  setLimit,
  removeLimit,
  toggleLimitStatus,
};
