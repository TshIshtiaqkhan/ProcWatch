const { contextBridge, ipcRenderer } = require("electron");

const electronAPI = {
  // Usage queries
  getToday: () => ipcRenderer.invoke("usage:getToday"),
  getPauseSummary: () => ipcRenderer.invoke("usage:getPauseSummary"),
  getRange: (startDate, endDate) =>
    ipcRenderer.invoke("usage:getRange", { startDate, endDate }),
  getAppDetail: (appName, startDate, endDate) =>
    ipcRenderer.invoke("usage:getAppDetail", { appName, startDate, endDate }),

  // Tracking control
  pauseTracking: () => ipcRenderer.invoke("tracking:pause"),
  resumeTracking: () => ipcRenderer.invoke("tracking:resume"),
  getTrackingStatus: () => ipcRenderer.invoke("tracking:status"),

  // Settings
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (settings) =>
    ipcRenderer.invoke("settings:update", settings),

  // Data
  exportData: (format) => ipcRenderer.invoke("data:export", { format }),
  // confirmationToken must equal "DELETE" — validated on the backend too.
  clearAllData: (confirmationToken) =>
    ipcRenderer.invoke("data:clearAll", { confirmationToken }),

  // Categories
  listCategories: () => ipcRenderer.invoke("categories:list"),
  updateCategory: (appName, category, isDistracting) =>
    ipcRenderer.invoke("categories:update", { appName, category, isDistracting }),
  removeCategory: (appName) =>
    ipcRenderer.invoke("categories:remove", { appName }),

  // Focus Mode
  startFocus: (durationMinutes) =>
    ipcRenderer.invoke("focus:start", { durationMinutes }),
  stopFocus: () => ipcRenderer.invoke("focus:stop"),
  getFocusStatus: () => ipcRenderer.invoke("focus:status"),
  getFocusHistory: (startDate, endDate) =>
    ipcRenderer.invoke("focus:history", { startDate, endDate }),
  onFocusDistraction: (callback) => {
    const handler = (_e, data) => callback(data);
    ipcRenderer.on("focus:distraction", handler);
    return () => ipcRenderer.removeListener("focus:distraction", handler);
  },
  onFocusCompleted: (callback) => {
    const handler = (_e, data) => callback(data);
    ipcRenderer.on("focus:completed", handler);
    return () => ipcRenderer.removeListener("focus:completed", handler);
  },

  // App Usage Limits
  getLimits: () => ipcRenderer.invoke("limits:get"),
  upsertLimit: (appName, limitMinutes, warnAtPercent, isEnabled) =>
    ipcRenderer.invoke("limits:upsert", { appName, limitMinutes, warnAtPercent, isEnabled }),
  deleteLimit: (appName) => ipcRenderer.invoke("limits:delete", { appName }),
  toggleLimit: (appName, isEnabled) =>
    ipcRenderer.invoke("limits:toggle", { appName, isEnabled }),
  testLimitNotification: () => ipcRenderer.invoke("limits:test"),
  onLimitsUpdated: (callback) => {
    const handler = (_e, data) => callback(data);
    ipcRenderer.on("limits:updated", handler);
    return () => ipcRenderer.removeListener("limits:updated", handler);
  },
  onLimitExceeded: (callback) => {
    const handler = (_e, data) => callback(data);
    ipcRenderer.on("limits:exceeded", handler);
    return () => ipcRenderer.removeListener("limits:exceeded", handler);
  },
  onLimitWarning: (callback) => {
    const handler = (_e, data) => callback(data);
    ipcRenderer.on("limits:warning", handler);
    return () => ipcRenderer.removeListener("limits:warning", handler);
  },

  // System
  checkDeps: () => ipcRenderer.invoke("system:checkDeps"),
  setAutoStart: (enabled) => ipcRenderer.invoke("system:setAutoStart", { enabled }),
  isTrackerReady: () => ipcRenderer.invoke("system:trackerReady"),
  isFirstRun: () => ipcRenderer.invoke("system:isFirstRun"),
  completeOnboarding: () => ipcRenderer.invoke("system:completeOnboarding"),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
