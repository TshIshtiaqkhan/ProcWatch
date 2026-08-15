const path = require("path");
const fs = require("fs");
const { app } = require("electron");

const OLD_CONFIG_DIR_NAME = "screen-time-app";
const CONFIG_DIR_NAME = "procwatch";

/**
 * Returns the app config directory, using XDG_CONFIG_HOME or ~/.config fallback.
 */
function getAppConfigDir() {
  return path.join(
    process.env.XDG_CONFIG_HOME || path.join(app.getPath("home"), ".config"),
    CONFIG_DIR_NAME
  );
}

// One-time migration from the old "screen-time-app" config dir to "procwatch".
// Runs at module load (before any caller reads getAppConfigDir) so the DB,
// logs, and settings move with the rename. No-ops on fresh installs.
(function migrateConfigDir() {
  try {
    const base =
      process.env.XDG_CONFIG_HOME || path.join(app.getPath("home"), ".config");
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

/**
 * Resolves asset paths correctly for both dev and packaged mode.
 */
function resolveAssetPath(...segments) {
  if (app.isPackaged) {
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
