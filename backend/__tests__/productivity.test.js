const {
  computeScore,
  calculateStreakFromDays,
} = require("../src/models/productivity.engine");

describe("Productivity Calculation Engine", () => {
  describe("computeScore", () => {
    it("returns 0 score when there is no activity", () => {
      const result = computeScore(0, 0, 0);
      expect(result).toBe(0);
    });

    it("returns 50 score when there is only neutral activity", () => {
      const result = computeScore(0, 0, 3600);
      expect(result).toBe(50);
    });

    it("returns 100 score when there is only productive activity", () => {
      const result = computeScore(3600, 0, 1800);
      expect(result).toBe(100);
    });

    it("returns 0 score when there is only distracting activity", () => {
      const result = computeScore(0, 3600, 1800);
      expect(result).toBe(0);
    });

    it("correctly calculates ratio when both productive and distracting exist", () => {
      // 3h productive, 1h distracting -> 75%
      const result = computeScore(10800, 3600, 1000);
      expect(result).toBe(75);
    });

    it("clamps score between 0 and 100", () => {
      expect(computeScore(5000, 1000, 0)).toBe(83);
      expect(computeScore(1000, 5000, 0)).toBe(17);
    });
  });

  describe("calculateStreakFromDays", () => {
    // Days are sorted descending: index 0 = today, index 1 = yesterday, etc.
    const goal = 70;
    const minSeconds = 600; // 10 minutes

    it("returns 0 streak when no days qualify", () => {
      const days = [
        { date: "2026-10-04", score: 50, totalSeconds: 1200 },
        { date: "2026-10-03", score: 40, totalSeconds: 2000 },
      ];
      const result = calculateStreakFromDays(days, goal, minSeconds);
      expect(result.currentStreak).toBe(0);
      expect(result.bestStreak).toBe(0);
      expect(result.goalMetToday).toBe(false);
    });

    it("counts today when today meets the goal", () => {
      const days = [
        { date: "2026-10-04", score: 85, totalSeconds: 1800 },
        { date: "2026-10-03", score: 50, totalSeconds: 1200 },
      ];
      const result = calculateStreakFromDays(days, goal, minSeconds);
      expect(result.currentStreak).toBe(1);
      expect(result.bestStreak).toBe(1);
      expect(result.goalMetToday).toBe(true);
    });

    it("chains consecutive days into current streak", () => {
      const days = [
        { date: "2026-10-04", score: 80, totalSeconds: 3600 }, // today
        { date: "2026-10-03", score: 75, totalSeconds: 4000 }, // yesterday
        { date: "2026-10-02", score: 90, totalSeconds: 5000 }, // 2 days ago
        { date: "2026-10-01", score: 60, totalSeconds: 3000 }, // broke streak
        { date: "2026-09-30", score: 85, totalSeconds: 4000 },
      ];
      const result = calculateStreakFromDays(days, goal, minSeconds);
      expect(result.currentStreak).toBe(3);
      expect(result.bestStreak).toBe(3);
      expect(result.goalMetToday).toBe(true);
    });

    it("preserves yesterday's streak when today is still in progress", () => {
      const days = [
        { date: "2026-10-04", score: 40, totalSeconds: 300 }, // today not yet qualified
        { date: "2026-10-03", score: 80, totalSeconds: 3600 }, // yesterday qualified
        { date: "2026-10-02", score: 75, totalSeconds: 4000 }, // 2 days ago qualified
      ];
      const result = calculateStreakFromDays(days, goal, minSeconds);
      expect(result.currentStreak).toBe(2);
      expect(result.goalMetToday).toBe(false);
    });

    it("breaks streak when a calendar day is skipped", () => {
      const days = [
        { date: "2026-10-04", score: 80, totalSeconds: 3600 },
        // 2026-10-03 skipped!
        { date: "2026-10-02", score: 85, totalSeconds: 4000 },
      ];
      const result = calculateStreakFromDays(days, goal, minSeconds);
      expect(result.currentStreak).toBe(1); // only today
    });

    it("ignores days with less than minimum active seconds", () => {
      const days = [
        { date: "2026-10-04", score: 100, totalSeconds: 60 }, // only 1 minute, doesn't qualify
      ];
      const result = calculateStreakFromDays(days, goal, minSeconds);
      expect(result.currentStreak).toBe(0);
      expect(result.goalMetToday).toBe(false);
    });

    it("tracks bestStreak across multiple historical streaks", () => {
      const days = [
        { date: "2026-10-04", score: 80, totalSeconds: 3600 }, // current streak = 1
        { date: "2026-10-03", score: 50, totalSeconds: 3600 }, // gap
        // Historical streak of 4 days:
        { date: "2026-10-02", score: 80, totalSeconds: 3600 },
        { date: "2026-10-01", score: 80, totalSeconds: 3600 },
        { date: "2026-09-30", score: 80, totalSeconds: 3600 },
        { date: "2026-09-29", score: 80, totalSeconds: 3600 },
        { date: "2026-09-28", score: 40, totalSeconds: 3600 }, // gap
      ];
      const result = calculateStreakFromDays(days, goal, minSeconds);
      expect(result.currentStreak).toBe(1);
      expect(result.bestStreak).toBe(4);
    });
  });
});
