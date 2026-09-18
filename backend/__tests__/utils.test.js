/**
 * Unit tests for backend utility functions.
 * These cover pure logic that does not require the Electron runtime or a real DB.
 */

// ─── formatDateString ─────────────────────────────────────────────────────────

// We import the real module; electron is auto-mocked via __mocks__/electron.js
jest.mock("electron");

const { formatDateString } = require("../src/utils/paths");

describe("formatDateString", () => {
  it("returns a YYYY-MM-DD string for a given Date", () => {
    const d = new Date("2026-08-30T12:00:00.000Z");
    const result = formatDateString(d);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("pads month and day with leading zeros", () => {
    // Create a date that would produce single-digit month/day if not padded
    const d = new Date("2026-01-05T00:00:00.000Z");
    const result = formatDateString(d);
    expect(result.length).toBe(10);
    const parts = result.split("-");
    expect(parts[0].length).toBe(4);
    expect(parts[1].length).toBe(2);
    expect(parts[2].length).toBe(2);
  });
});

// ─── DB param converter ───────────────────────────────────────────────────────
// convertParams is not exported, so we test it indirectly via the pool mock or
// by extracting the inline logic here. This documents the expected transformation.

describe("convertParams logic", () => {
  // Replicate the logic from db/index.js for isolated testing
  function convertParams(sql, params = []) {
    const newParams = [];
    const sqliteSql = sql.replace(/\$(\d+)/g, (_, n) => {
      newParams.push(params[parseInt(n, 10) - 1]);
      return "?";
    });
    return { sqliteSql, newParams };
  }

  it("converts $1 placeholders to ? and maps params in order", () => {
    const sql = "SELECT * FROM sessions WHERE date_local = $1 AND is_idle = $2";
    const params = ["2026-08-30", 0];
    const { sqliteSql, newParams } = convertParams(sql, params);

    expect(sqliteSql).toBe("SELECT * FROM sessions WHERE date_local = ? AND is_idle = ?");
    expect(newParams).toEqual(["2026-08-30", 0]);
  });

  it("handles repeated positional params ($1 used twice)", () => {
    const sql = "INSERT INTO sessions (start_time, end_time) VALUES ($1, $1)";
    const params = ["2026-08-30T09:00:00Z"];
    const { sqliteSql, newParams } = convertParams(sql, params);

    expect(sqliteSql).toBe(
      "INSERT INTO sessions (start_time, end_time) VALUES (?, ?)"
    );
    expect(newParams).toEqual([
      "2026-08-30T09:00:00Z",
      "2026-08-30T09:00:00Z",
    ]);
  });

  it("passes through SQL with no placeholders unchanged", () => {
    const sql = "SELECT COUNT(*) FROM sessions";
    const { sqliteSql, newParams } = convertParams(sql);
    expect(sqliteSql).toBe(sql);
    expect(newParams).toEqual([]);
  });
});

// ─── MIN_SESSION_SECONDS guard ────────────────────────────────────────────────
// Verify the threshold logic without loading the actual tracker module
// (which has side effects via powerMonitor.on at module load time).

describe("session threshold logic", () => {
  const MIN_SESSION_SECONDS = 3;

  function shouldDiscard(startIso, endIso) {
    const duration = Math.round(
      (new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000
    );
    return duration < MIN_SESSION_SECONDS;
  }

  it("discards sessions shorter than 3 seconds", () => {
    const start = "2026-08-30T09:00:00.000Z";
    const end   = "2026-08-30T09:00:02.000Z"; // 2 s
    expect(shouldDiscard(start, end)).toBe(true);
  });

  it("keeps sessions exactly at 3 seconds", () => {
    const start = "2026-08-30T09:00:00.000Z";
    const end   = "2026-08-30T09:00:03.000Z"; // 3 s
    expect(shouldDiscard(start, end)).toBe(false);
  });

  it("keeps sessions longer than 3 seconds", () => {
    const start = "2026-08-30T09:00:00.000Z";
    const end   = "2026-08-30T09:05:00.000Z"; // 5 min
    expect(shouldDiscard(start, end)).toBe(false);
  });
});

// ─── SQL LIKE wildcard escaping logic ─────────────────────────────────────────

const { sanitizeLikePattern, isValidSettingValue } = require("../src/validators");

describe("SQL LIKE wildcard escaping logic", () => {
  it("escapes %, _, and \\ in app name", () => {
    expect(sanitizeLikePattern("code%test")).toBe("code\\%test");
    expect(sanitizeLikePattern("app_name")).toBe("app\\_name");
    expect(sanitizeLikePattern("back\\slash")).toBe("back\\\\slash");
    expect(sanitizeLikePattern("normalApp")).toBe("normalApp");
  });
});

describe("isValidSettingValue security validation", () => {
  it("validates polling_interval_seconds within safe positive bounds (1..3600)", () => {
    expect(isValidSettingValue("polling_interval_seconds", "5")).toBe(true);
    expect(isValidSettingValue("polling_interval_seconds", 10)).toBe(true);
    // Rejects DoS attack vectors: 0, negative values, decimals, non-numbers
    expect(isValidSettingValue("polling_interval_seconds", "0")).toBe(false);
    expect(isValidSettingValue("polling_interval_seconds", "-5")).toBe(false);
    expect(isValidSettingValue("polling_interval_seconds", "3601")).toBe(false);
    expect(isValidSettingValue("polling_interval_seconds", "invalid")).toBe(false);
  });

  it("validates idle_threshold_seconds within safe bounds (10..86400)", () => {
    expect(isValidSettingValue("idle_threshold_seconds", "90")).toBe(true);
    expect(isValidSettingValue("idle_threshold_seconds", "5")).toBe(false);
    expect(isValidSettingValue("idle_threshold_seconds", "100000")).toBe(false);
  });

  it("validates data_retention_days", () => {
    expect(isValidSettingValue("data_retention_days", "never")).toBe(true);
    expect(isValidSettingValue("data_retention_days", "30")).toBe(true);
    expect(isValidSettingValue("data_retention_days", "0")).toBe(false);
    expect(isValidSettingValue("data_retention_days", "-1")).toBe(false);
  });

  it("validates boolean settings", () => {
    expect(isValidSettingValue("launch_on_login", "true")).toBe(true);
    expect(isValidSettingValue("launch_on_login", "false")).toBe(true);
    expect(isValidSettingValue("launch_on_login", true)).toBe(true);
    expect(isValidSettingValue("launch_on_login", "yes")).toBe(false);
  });

  it("validates focus session settings and block mode", () => {
    expect(isValidSettingValue("focus_session_duration_minutes", "25")).toBe(true);
    expect(isValidSettingValue("focus_session_duration_minutes", "0")).toBe(false);
    expect(isValidSettingValue("focus_session_block_mode", "overlay")).toBe(true);
    expect(isValidSettingValue("focus_session_block_mode", "minimal")).toBe(true);
    expect(isValidSettingValue("focus_session_block_mode", "arbitrary")).toBe(false);
  });

  it("rejects unknown keys, null, and undefined", () => {
    expect(isValidSettingValue("unknown_key", "value")).toBe(false);
    expect(isValidSettingValue("polling_interval_seconds", null)).toBe(false);
    expect(isValidSettingValue("polling_interval_seconds", undefined)).toBe(false);
  });
});
