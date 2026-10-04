const { BrowserWindow } = require("electron");

let _mainWindow = null;

function setMainWindow(win) {
  _mainWindow = win;
}

function getActiveWindow() {
  if (_mainWindow && !_mainWindow.isDestroyed()) return _mainWindow;
  try {
    const wins = BrowserWindow.getAllWindows();
    return wins.length > 0 && !wins[0].isDestroyed() ? wins[0] : null;
  } catch {
    return null;
  }
}

module.exports = { setMainWindow, getActiveWindow };
