jest.mock("electron");

const { isValidDateString, isValidSettingValue } = require("../src/validators");

describe("focus session validation and calculation logic", () => {
  describe("isValidSettingValue", () => {
    it("validates polling_interval_seconds correctly", () => {
      expect(isValidSettingValue("polling_interval_seconds", "5")).toBe(true);
      expect(isValidSettingValue("polling_interval_seconds", 10)).toBe(true);
      expect(isValidSettingValue("polling_interval_seconds", "0")).toBe(false);
      expect(isValidSettingValue("polling_interval_seconds", -5)).toBe(false);
      expect(isValidSettingValue("polling_interval_seconds", 500)).toBe(false);
      expect(isValidSettingValue("polling_interval_seconds", "abc")).toBe(false);
    });

    it("validates idle_threshold_seconds correctly", () => {
      expect(isValidSettingValue("idle_threshold_seconds", "90")).toBe(true);
      expect(isValidSettingValue("idle_threshold_seconds", 5)).toBe(false);
      expect(isValidSettingValue("idle_threshold_seconds", "abc")).toBe(false);
    });

    it("validates boolean flags correctly", () => {
      expect(isValidSettingValue("launch_on_login", "true")).toBe(true);
      expect(isValidSettingValue("launch_on_login", "false")).toBe(true);
      expect(isValidSettingValue("launch_on_login", "yes")).toBe(false);
    });

    it("validates data_retention_days correctly", () => {
      expect(isValidSettingValue("data_retention_days", "never")).toBe(true);
      expect(isValidSettingValue("data_retention_days", "30")).toBe(true);
      expect(isValidSettingValue("data_retention_days", "-1")).toBe(false);
    });

    it("validates focus_session_block_mode correctly", () => {
      expect(isValidSettingValue("focus_session_block_mode", "overlay")).toBe(true);
      expect(isValidSettingValue("focus_session_block_mode", "invalid")).toBe(false);
    });

    it("rejects unknown settings keys or null/undefined values", () => {
      expect(isValidSettingValue("unknown_key", "val")).toBe(false);
      expect(isValidSettingValue("polling_interval_seconds", null)).toBe(false);
      expect(isValidSettingValue("polling_interval_seconds", undefined)).toBe(false);
    });
  });
  it("validates valid dates correctly", () => {
    expect(isValidDateString("2026-09-06")).toBe(true);
    expect(isValidDateString("2026-01-01")).toBe(true);
    expect(isValidDateString("invalid")).toBe(false);
    expect(isValidDateString("06-09-2026")).toBe(false);
    expect(isValidDateString(null)).toBe(false);
  });

  it("calculates remaining time correctly", () => {
    const startedAt = new Date("2026-09-06T10:00:00.000Z");
    const durationMinutes = 25;
    const endsAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    const checkNow = new Date("2026-09-06T10:10:00.000Z"); // 10 minutes in
    const remainingSeconds = Math.max(
      0,
      Math.round((endsAt.getTime() - checkNow.getTime()) / 1000)
    );

    expect(remainingSeconds).toBe(15 * 60); // 15 minutes remaining
  });

  it("handles distraction deduplication across ticks", () => {
    // Logic test: same app on consecutive polls should not duplicate distraction count
    let lastDistractingApp = null;
    let distractions = 0;

    function recordApp(appName, isDistracting) {
      if (appName === lastDistractingApp) {
        return false;
      }
      if (!isDistracting) {
        lastDistractingApp = null;
        return false;
      }
      lastDistractingApp = appName;
      distractions += 1;
      return true;
    }

    // First switch to distracting app: counted
    expect(recordApp("spotify", true)).toBe(true);
    expect(distractions).toBe(1);

    // Same distracting app on next poll: ignored
    expect(recordApp("spotify", true)).toBe(false);
    expect(distractions).toBe(1);

    // Switch to non-distracting app
    expect(recordApp("code", false)).toBe(false);
    expect(distractions).toBe(1);

    // Switch back to distracting app: counted again
    expect(recordApp("spotify", true)).toBe(true);
    expect(distractions).toBe(2);
  });
});
