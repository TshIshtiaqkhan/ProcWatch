function isValidDateString(str) {
  return typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function isNonEmptyString(str) {
  return typeof str === "string" && str.trim().length > 0;
}

function isValidSettingValue(key, val) {
  if (val === null || val === undefined) return false;
  const strVal = String(val);
  switch (key) {
    case "polling_interval_seconds": {
      const n = Number(val);
      return Number.isInteger(n) && n >= 1 && n <= 60;
    }
    case "idle_threshold_seconds": {
      const n = Number(val);
      return Number.isInteger(n) && n >= 10 && n <= 3600;
    }
    case "data_retention_days": {
      if (strVal === "never") return true;
      const n = Number(val);
      return Number.isInteger(n) && n >= 1 && n <= 365;
    }
    case "launch_on_login":
    case "start_minimized":
    case "close_to_tray":
    case "first_run_complete":
      return strVal === "true" || strVal === "false";
    case "focus_session_duration_minutes": {
      const n = Number(val);
      return Number.isInteger(n) && n >= 1 && n <= 120;
    }
    case "focus_session_break_minutes": {
      const n = Number(val);
      return Number.isInteger(n) && n >= 1 && n <= 60;
    }
    case "focus_session_block_mode":
      return ["overlay", "minimal", "strict"].includes(strVal);
    default:
      return true;
  }
}

module.exports = { isValidDateString, isNonEmptyString, isValidSettingValue };
