import { describe, it, expect } from "vitest";
import { formatDuration, formatYAxis, todayDateString, daysAgo, CHART_COLORS } from "../lib/constants";

describe("Frontend Constants & Formatters", () => {
  describe("formatDuration", () => {
    it("formats pure seconds", () => {
      expect(formatDuration(45)).toBe("45s");
      expect(formatDuration(0)).toBe("0s");
    });

    it("formats minutes and seconds", () => {
      expect(formatDuration(65)).toBe("1m 5s");
      expect(formatDuration(180)).toBe("3m 0s");
    });

    it("formats hours and minutes", () => {
      expect(formatDuration(3600)).toBe("1h 0m");
      expect(formatDuration(3665)).toBe("1h 1m");
      expect(formatDuration(7320)).toBe("2h 2m");
    });
  });

  describe("formatYAxis", () => {
    it("formats minutes for values under 1 hour", () => {
      expect(formatYAxis(300)).toBe("5m");
      expect(formatYAxis(1800)).toBe("30m");
    });

    it("formats hours without minutes if exact hour", () => {
      expect(formatYAxis(3600)).toBe("1h");
      expect(formatYAxis(7200)).toBe("2h");
    });

    it("formats hours with minutes if partial hour", () => {
      expect(formatYAxis(5400)).toBe("1h30m");
    });
  });

  describe("Date utilities", () => {
    it("returns today in YYYY-MM-DD format", () => {
      const today = todayDateString();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("computes previous dates with daysAgo", () => {
      const fiveDaysAgo = daysAgo(5);
      expect(fiveDaysAgo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(fiveDaysAgo <= todayDateString()).toBe(true);
    });
  });

  describe("Palette", () => {
    it("provides 6 distinctive chart colors", () => {
      expect(CHART_COLORS).toHaveLength(6);
      CHART_COLORS.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });
});
