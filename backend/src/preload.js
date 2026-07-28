const { contextBridge, ipcRenderer } = require("electron");

const electronAPI = {
  // Usage queries
  getToday: () => ipcRenderer.invoke("usage:getToday"),
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
  clearAllData: () => ipcRenderer.invoke("data:clearAll"),

  // Categories
  listCategories: () => ipcRenderer.invoke("categories:list"),
  updateCategory: (appName, category, isDistracting) =>
    ipcRenderer.invoke("categories:update", { appName, category, isDistracting }),
  removeCategory: (appName) =>
    ipcRenderer.invoke("categories:remove", { appName }),

  // System
  checkDeps: () => ipcRenderer.invoke("system:checkDeps"),
  setAutoStart: (enabled) => ipcRenderer.invoke("system:setAutoStart", { enabled }),
  isTrackerReady: () => ipcRenderer.invoke("system:trackerReady"),
  isFirstRun: () => ipcRenderer.invoke("system:isFirstRun"),
  completeOnboarding: () => ipcRenderer.invoke("system:completeOnboarding"),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
