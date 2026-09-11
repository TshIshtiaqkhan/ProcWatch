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

  // System
  checkDeps: () => ipcRenderer.invoke("system:checkDeps"),
  setAutoStart: (enabled) => ipcRenderer.invoke("system:setAutoStart", { enabled }),
  isTrackerReady: () => ipcRenderer.invoke("system:trackerReady"),
  isFirstRun: () => ipcRenderer.invoke("system:isFirstRun"),
  completeOnboarding: () => ipcRenderer.invoke("system:completeOnboarding"),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
