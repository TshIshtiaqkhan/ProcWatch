function isValidDateString(str) {
  return typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function isNonEmptyString(str) {
  return typeof str === "string" && str.trim().length > 0;
}

function sanitizeLikePattern(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[\%_\\]/g, "\\$&");
}

function isValidSettingValue(key, value) {
  if (value === null || value === undefined) return false;
  const strVal = String(value);

  switch (key) {
    case "polling_interval_seconds": {
      const num = Number(strVal);
      return Number.isInteger(num) && num >= 1 && num <= 3600;
    }
    case "idle_threshold_seconds": {
      const num = Number(strVal);
      return Number.isInteger(num) && num >= 10 && num <= 86400;
    }
    case "data_retention_days": {
      if (strVal === "never") return true;
      const num = Number(strVal);
      return Number.isInteger(num) && num >= 1 && num <= 3650;
    }
    case "launch_on_login":
    case "start_minimized":
    case "close_to_tray":
    case "first_run_complete":
      return strVal === "true" || strVal === "false";
    case "focus_session_duration_minutes": {
      const num = Number(strVal);
      return Number.isInteger(num) && num >= 1 && num <= 120;
    }
    case "focus_session_break_minutes": {
      const num = Number(strVal);
      return Number.isInteger(num) && num >= 1 && num <= 60;
    }
    case "focus_session_block_mode":
      return strVal === "overlay" || strVal === "minimal";
    default:
      return false;
  }
}

module.exports = {
  isValidDateString,
  isNonEmptyString,
  sanitizeLikePattern,
  isValidSettingValue,
};
