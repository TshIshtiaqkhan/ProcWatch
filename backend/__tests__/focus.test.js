jest.mock("electron");

const { isValidDateString } = require("../src/validators");

describe("focus session validation and calculation logic", () => {
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
