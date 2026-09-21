/**
 * Security helper utilities for main process window and navigation controls.
 */

function isAllowedNavigationUrl(navigationUrl, isDev = process.env.NODE_ENV === "development", devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173") {
  try {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol === "file:") return true;
    if (isDev) {
      const parsedDevUrl = new URL(devUrl);
      if (parsedUrl.origin === parsedDevUrl.origin) return true;
    }
  } catch {}
  return false;
}

module.exports = { isAllowedNavigationUrl };
