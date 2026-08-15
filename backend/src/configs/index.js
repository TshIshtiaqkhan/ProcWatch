const DEFAULT_SETTINGS = {
  polling_interval_seconds: "5",
  idle_threshold_seconds: "90",
  data_retention_days: "never",
  launch_on_login: "false",
  start_minimized: "false",
  close_to_tray: "true",
  first_run_complete: "false",
  focus_session_duration_minutes: "25",
  focus_session_break_minutes: "5",
  focus_session_block_mode: "overlay",
};

const DEFAULT_CATEGORIES = {
  code: "Development",
  "code-oss": "Development",
  codium: "Development",
  firefox: "Browser",
  "firefox-esr": "Browser",
  chromium: "Browser",
  "google-chrome-stable": "Browser",
  slack: "Communication",
  discord: "Communication",
  telegram: "Communication",
  spotify: "Entertainment",
  vlc: "Entertainment",
  terminal: "System",
  "gnome-terminal": "System",
  kitty: "System",
  alacritty: "System",
  nautilus: "System",
  thunar: "System",
  gimp: "Creative",
  inkscape: "Creative",
};

module.exports = { DEFAULT_SETTINGS, DEFAULT_CATEGORIES };
