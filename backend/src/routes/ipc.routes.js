const { ipcMain } = require("electron");
const controllers = require("../controllers");

// Registers all IPC channels, wiring each to its controller handler.
// `ctx` carries shared app state the handlers need (main window, cached
// settings, tray menu refresher, app icon path).
function registerIpcRoutes(ctx) {
  // Usage queries
  ipcMain.handle("usage:getToday", (e, p) => controllers.getToday(e, p, ctx));
  ipcMain.handle("usage:getRange", (e, p) => controllers.getRange(e, p, ctx));
  ipcMain.handle("usage:getAppDetail", (e, p) => controllers.getAppDetail(e, p, ctx));

  // Tracking control
  ipcMain.handle("tracking:pause", (e, p) => controllers.pauseTracking(e, p, ctx));
  ipcMain.handle("tracking:resume", (e, p) => controllers.resumeTracking(e, p, ctx));
  ipcMain.handle("tracking:status", (e, p) => controllers.trackingStatus(e, p, ctx));

  // Settings
  ipcMain.handle("settings:get", (e, p) => controllers.getSettings(e, p, ctx));
  ipcMain.handle("settings:update", (e, p) => controllers.updateSettings(e, p, ctx));

  // Data
  ipcMain.handle("data:export", (e, p) => controllers.exportData(e, p, ctx));
  ipcMain.handle("data:clearAll", (e, p) => controllers.clearAllData(e, p, ctx));

  // Categories
  ipcMain.handle("categories:list", (e, p) => controllers.listCategories(e, p, ctx));
  ipcMain.handle("categories:update", (e, p) => controllers.updateCategory(e, p, ctx));
  ipcMain.handle("categories:remove", (e, p) => controllers.removeCategory(e, p, ctx));

  // System
  ipcMain.handle("system:checkDeps", (e, p) => controllers.checkDeps(e, p, ctx));
  ipcMain.handle("system:setAutoStart", (e, p) => controllers.setAutoStart(e, p, ctx));
  ipcMain.handle("system:trackerReady", (e, p) => controllers.trackerReady(e, p, ctx));
  ipcMain.handle("system:isFirstRun", (e, p) => controllers.isFirstRun(e, p, ctx));
  ipcMain.handle("system:completeOnboarding", (e, p) => controllers.completeOnboarding(e, p, ctx));
}

module.exports = { registerIpcRoutes };
