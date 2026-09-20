/**
 * Unit tests for the Windows platform adapter and normalization logic.
 */

jest.mock("electron");

const path = require("path");
const os = require("os");
const { normalizeAppName, getAppConfigDir } = require("../src/utils/paths");
const { DEFAULT_CATEGORIES } = require("../src/configs");
const windowsTracker = require("../src/models/windows.tracker");

describe("Windows Process Normalization (normalizeAppName)", () => {
  it("strips .exe extension case-insensitively", () => {
    expect(normalizeAppName("chrome.exe")).toBe("chrome");
    expect(normalizeAppName("Code.exe")).toBe("Code");
    expect(normalizeAppName("DISCORD.EXE")).toBe("DISCORD");
    expect(normalizeAppName("Spotify.Exe")).toBe("Spotify");
  });

  it("leaves process names without .exe untouched", () => {
    expect(normalizeAppName("chrome")).toBe("chrome");
    expect(normalizeAppName("code")).toBe("code");
    expect(normalizeAppName("gnome-terminal")).toBe("gnome-terminal");
  });

  it("trims extraneous whitespace", () => {
    expect(normalizeAppName("  slack.exe  ")).toBe("slack");
    expect(normalizeAppName("   notepad   ")).toBe("notepad");
  });

  it("returns 'Unknown' for empty or non-string inputs", () => {
    expect(normalizeAppName("")).toBe("Unknown");
    expect(normalizeAppName("   ")).toBe("Unknown");
    expect(normalizeAppName(null)).toBe("Unknown");
    expect(normalizeAppName(undefined)).toBe("Unknown");
    expect(normalizeAppName(123)).toBe("Unknown");
  });
});

describe("Windows Path Resolution (getAppConfigDir)", () => {
  const originalPlatform = process.platform;
  const originalAppData = process.env.APPDATA;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    process.env.APPDATA = originalAppData;
  });

  it("resolves to %APPDATA%/procwatch on win32 when appData env var is present", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    process.env.APPDATA = "C:\\Users\\TestUser\\AppData\\Roaming";

    // Simulate getPath throwing or returning fallback
    const electron = require("electron");
    const origGetPath = electron.app.getPath;
    electron.app.getPath = jest.fn(() => {
      throw new Error("app not ready");
    });

    const dir = getAppConfigDir();
    expect(dir).toBe(path.join("C:\\Users\\TestUser\\AppData\\Roaming", "procwatch"));

    electron.app.getPath = origGetPath;
  });
});

describe("Windows Category Coverage", () => {
  it("includes common Windows processes in default categories", () => {
    expect(DEFAULT_CATEGORIES["msedge"]).toBe("Browser");
    expect(DEFAULT_CATEGORIES["devenv"]).toBe("Development");
    expect(DEFAULT_CATEGORIES["notepad"]).toBe("Productivity");
    expect(DEFAULT_CATEGORIES["explorer"]).toBe("System");
    expect(DEFAULT_CATEGORIES["powershell"]).toBe("System");
    expect(DEFAULT_CATEGORIES["Teams"]).toBe("Communication");
    expect(DEFAULT_CATEGORIES["Zoom"]).toBe("Communication");
  });

  it("matches normalized Windows processes against categories", () => {
    const rawWindowsApp = "msedge.exe";
    const cleanApp = normalizeAppName(rawWindowsApp);
    expect(DEFAULT_CATEGORIES[cleanApp]).toBe("Browser");
  });
});

describe("Windows Tracker Module Interface", () => {
  it("exports required tracker lifecycle functions", () => {
    expect(typeof windowsTracker.getActiveWindow).toBe("function");
    expect(typeof windowsTracker.normalizeAppName).toBe("function");
    expect(typeof windowsTracker.disposeWindowsTracker).toBe("function");
    expect(typeof windowsTracker.queryActiveWindowOnce).toBe("function");
  });

  it("returns null safely when called on non-win32 platform", async () => {
    const result = await windowsTracker.getActiveWindow();
    if (process.platform !== "win32") {
      expect(result).toBeNull();
    }
  });
});

describe("Windows System Dependency Checks", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("returns hasDeps: true, no missing packages, and isWayland: false on win32", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    const { checkDeps } = require("../src/controllers");
    const res = await checkDeps();
    expect(res.success).toBe(true);
    expect(res.data.platform).toBe("win32");
    expect(res.data.xdotool).toBe(true);
    expect(res.data.wmctrl).toBe(true);
    expect(res.data.isWayland).toBe(false);
  });
});

