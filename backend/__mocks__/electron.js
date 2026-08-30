// Jest mock for the 'electron' module.
// Tests that exercise backend code must not load the real Electron runtime,
// so we stub out every API surface used by the source under test.

const powerMonitor = {
  getSystemIdleTime: jest.fn(() => 0),
  on: jest.fn(),
};

const app = {
  isPackaged: false,
  getPath: jest.fn((name) => `/tmp/procwatch-test/${name}`),
  getPath: jest.fn(() => "/tmp"),
  quit: jest.fn(),
};

const dialog = {
  showErrorBox: jest.fn(),
  showSaveDialog: jest.fn(),
};

module.exports = { powerMonitor, app, dialog };
