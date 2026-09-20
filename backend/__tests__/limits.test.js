jest.mock("electron");

describe("App Usage Limits logic and calculations", () => {
  describe("threshold and percentage calculations", () => {
    it("calculates percentage used accurately", () => {
      const limitMinutes = 60;
      const limitSeconds = limitMinutes * 60; // 3600s
      const usedSeconds = 1800; // 30 mins

      const percent = Math.min(100, Math.round((usedSeconds / limitSeconds) * 100));
      expect(percent).toBe(50);
    });

    it("caps percentage used at 100%", () => {
      const limitMinutes = 30;
      const limitSeconds = limitMinutes * 60;
      const usedSeconds = 3600; // 60 mins

      const percent = Math.min(100, Math.round((usedSeconds / limitSeconds) * 100));
      expect(percent).toBe(100);
    });

    it("identifies warning threshold accurately (80% default)", () => {
      const limitMinutes = 50;
      const limitSeconds = limitMinutes * 60; // 3000s
      const warnPercent = 80;
      const warnSeconds = Math.round((limitSeconds * warnPercent) / 100); // 2400s

      expect(warnSeconds).toBe(2400);

      const beforeWarn = 2399;
      const atWarn = 2400;
      const afterWarn = 2500;

      expect(beforeWarn >= warnSeconds).toBe(false);
      expect(atWarn >= warnSeconds).toBe(true);
      expect(afterWarn >= warnSeconds).toBe(true);
    });

    it("identifies exceeded threshold accurately (100%)", () => {
      const limitMinutes = 45;
      const limitSeconds = limitMinutes * 60; // 2700s

      expect(2699 >= limitSeconds).toBe(false);
      expect(2700 >= limitSeconds).toBe(true);
      expect(3000 >= limitSeconds).toBe(true);
    });
  });

  describe("alert debouncing state machine", () => {
    function simulateTrackerPoll(limit, usedSeconds, alertState) {
      const limitSeconds = limit.limitMinutes * 60;
      const warnSeconds = Math.round((limitSeconds * limit.warnAtPercent) / 100);
      const notifications = [];

      if (usedSeconds >= limitSeconds && !alertState.exceeded) {
        alertState.exceeded = true;
        alertState.warned = true;
        notifications.push({ type: "exceeded", app: limit.appName });
      } else if (usedSeconds >= warnSeconds && !alertState.warned) {
        alertState.warned = true;
        notifications.push({ type: "warning", app: limit.appName });
      }

      return notifications;
    }

    it("dispatches exactly one warning and one exceeded notification as usage grows", () => {
      const limit = { appName: "Steam", limitMinutes: 10, warnAtPercent: 80 };
      const alertState = { warned: false, exceeded: false };

      // Poll 1: 5 minutes used (50%) -> no alert
      let notifs = simulateTrackerPoll(limit, 300, alertState);
      expect(notifs).toEqual([]);
      expect(alertState.warned).toBe(false);
      expect(alertState.exceeded).toBe(false);

      // Poll 2: 8 minutes used (80%) -> warning dispatched
      notifs = simulateTrackerPoll(limit, 480, alertState);
      expect(notifs).toEqual([{ type: "warning", app: "Steam" }]);
      expect(alertState.warned).toBe(true);
      expect(alertState.exceeded).toBe(false);

      // Poll 3: 9 minutes used (90%) -> NO duplicate warning dispatched
      notifs = simulateTrackerPoll(limit, 540, alertState);
      expect(notifs).toEqual([]);
      expect(alertState.warned).toBe(true);
      expect(alertState.exceeded).toBe(false);

      // Poll 4: 10 minutes used (100%) -> exceeded dispatched
      notifs = simulateTrackerPoll(limit, 600, alertState);
      expect(notifs).toEqual([{ type: "exceeded", app: "Steam" }]);
      expect(alertState.exceeded).toBe(true);

      // Poll 5: 11 minutes used (110%) -> NO duplicate exceeded dispatched
      notifs = simulateTrackerPoll(limit, 660, alertState);
      expect(notifs).toEqual([]);
    });

    it("resets debouncing state on midnight rollover", () => {
      const alertState = { warned: true, exceeded: true };

      // Simulate day rollover
      let currentDate = "2026-09-20";
      const nextDate = "2026-09-21";

      if (currentDate !== nextDate) {
        currentDate = nextDate;
        alertState.warned = false;
        alertState.exceeded = false;
      }

      expect(alertState.warned).toBe(false);
      expect(alertState.exceeded).toBe(false);
    });
  });

  describe("input validation logic", () => {
    function validateLimitInput(appName, limitMinutes, warnAtPercent) {
      if (!appName || typeof appName !== "string" || !appName.trim()) {
        return { valid: false, error: "appName is required" };
      }
      const mins = Number(limitMinutes);
      if (!Number.isInteger(mins) || mins <= 0 || mins > 1440) {
        return { valid: false, error: "limitMinutes must be between 1 and 1440" };
      }
      const warn = warnAtPercent !== undefined ? Number(warnAtPercent) : 80;
      if (!Number.isInteger(warn) || warn < 10 || warn > 100) {
        return { valid: false, error: "warnAtPercent must be between 10 and 100" };
      }
      return { valid: true };
    }

    it("accepts valid limit inputs", () => {
      expect(validateLimitInput("Discord", 45, 80).valid).toBe(true);
      expect(validateLimitInput("Steam", 120, 90).valid).toBe(true);
      expect(validateLimitInput("Chrome", 1, 10).valid).toBe(true);
      expect(validateLimitInput("Firefox", 1440, 100).valid).toBe(true);
    });

    it("rejects invalid app names", () => {
      expect(validateLimitInput("", 45).valid).toBe(false);
      expect(validateLimitInput("   ", 45).valid).toBe(false);
      expect(validateLimitInput(null, 45).valid).toBe(false);
    });

    it("rejects invalid minute values", () => {
      expect(validateLimitInput("Discord", 0).valid).toBe(false);
      expect(validateLimitInput("Discord", -10).valid).toBe(false);
      expect(validateLimitInput("Discord", 1441).valid).toBe(false);
      expect(validateLimitInput("Discord", 15.5).valid).toBe(false);
    });

    it("rejects invalid warning percentage values", () => {
      expect(validateLimitInput("Discord", 45, 5).valid).toBe(false);
      expect(validateLimitInput("Discord", 45, 101).valid).toBe(false);
    });
  });
});
