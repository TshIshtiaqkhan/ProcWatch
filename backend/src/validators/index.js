function isValidDateString(str) {
  return typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function isNonEmptyString(str) {
  return typeof str === "string" && str.trim().length > 0;
}

function isValidSettingValue(key, value) {
  if (value === null || value === undefined) return false;
  const valStr = String(value);

  switch (key) {
    case "polling_interval_seconds": {
      const num = Number(valStr);
      return Number.isInteger(num) && num >= 1 && num <= 300;
    }
    case "idle_threshold_seconds": {
      const num = Number(valStr);
      return Number.isInteger(num) && num >= 10 && num <= 86400;
    }
    case "focus_session_duration_minutes": {
      const num = Number(valStr);
      return Number.isInteger(num) && num >= 1 && num <= 120;
    }
    case "focus_session_break_minutes": {
      const num = Number(valStr);
      return Number.isInteger(num) && num >= 1 && num <= 60;
    }
    case "launch_on_login":
    case "start_minimized":
    case "close_to_tray":
    case "first_run_complete":
      return valStr === "true" || valStr === "false";
    case "data_retention_days": {
      if (valStr === "never") return true;
      const num = Number(valStr);
      return Number.isInteger(num) && num >= 1 && num <= 3650;
    }
    case "focus_session_block_mode":
      return ["overlay", "notification", "strict"].includes(valStr);
    default:
      return false;
  }
}

module.exports = { isValidDateString, isNonEmptyString, isValidSettingValue };
