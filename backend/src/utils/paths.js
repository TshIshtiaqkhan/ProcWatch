const path = require("path");
const fs = require("fs");
const os = require("os");
const electron = require("electron");
const app = typeof electron === "object" && electron.app ? electron.app : null;

const OLD_CONFIG_DIR_NAME = "screen-time-app";
const CONFIG_DIR_NAME = "procwatch";

/**
 * Returns the app config directory, using XDG_CONFIG_HOME or ~/.config fallback.
 */
function getAppConfigDir() {
  const home = (app && typeof app.getPath === "function")
    ? app.getPath("home")
    : process.env.HOME || os.homedir();

  return path.join(
    process.env.XDG_CONFIG_HOME || path.join(home, ".config"),
    CONFIG_DIR_NAME
  );
}

// One-time migration from the old "screen-time-app" config dir to "procwatch".
// Runs at module load (before any caller reads getAppConfigDir) so the DB,
// logs, and settings move with the rename. No-ops on fresh installs.
(function migrateConfigDir() {
  try {
    const home = (app && typeof app.getPath === "function")
      ? app.getPath("home")
      : process.env.HOME || os.homedir();

    const base =
      process.env.XDG_CONFIG_HOME || path.join(home, ".config");
    const oldDir = path.join(base, OLD_CONFIG_DIR_NAME);
    const newDir = path.join(base, CONFIG_DIR_NAME);
    if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
      fs.renameSync(oldDir, newDir);
    } else if (fs.existsSync(oldDir) && fs.existsSync(newDir)) {
      console.warn(
        `[paths] Both ${oldDir} and ${newDir} exist; skipping migration to avoid data loss.`
      );
    }
  } catch (err) {
    console.warn("[paths] Config dir migration skipped:", err.message);
  }
})();

// Automatically clean up old desktop entries from previous app name
(function cleanLegacyDesktopEntries() {
  try {
    const home = (app && typeof app.getPath === "function")
      ? app.getPath("home")
      : process.env.HOME || os.homedir();

    const oldAutostart = path.join(
      process.env.XDG_CONFIG_HOME || path.join(home, ".config"),
      "autostart",
      "screen-time-tracker.desktop"
    );
    if (fs.existsSync(oldAutostart)) {
      fs.unlinkSync(oldAutostart);
    }

    const oldAppEntry = path.join(
      process.env.XDG_DATA_HOME || path.join(home, ".local", "share"),
      "applications",
      "screen-time-tracker.desktop"
    );
    if (fs.existsSync(oldAppEntry)) {
      fs.unlinkSync(oldAppEntry);
    }
  } catch (err) {
    console.warn("[paths] Legacy desktop cleanup skipped:", err.message);
  }
})();

/**
 * Resolves asset paths correctly for both dev and packaged mode.
 */
function resolveAssetPath(...segments) {
  if (app && app.isPackaged) {
    return path.join(process.resourcesPath, ...segments);
  }
  // paths.js lives at backend/src/utils/, so three levels up reaches the project root;
  // the app icons now live under frontend/assets/icon/ in dev mode.
  return path.join(__dirname, "..", "..", "..", "frontend", ...segments);
}

/**
 * Formats a Date object as YYYY-MM-DD string.
 */
function formatDateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

module.exports = { getAppConfigDir, resolveAssetPath, formatDateString };
