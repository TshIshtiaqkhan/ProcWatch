import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTodayData } from "../hooks/useTodayData";

describe("useTodayData hook", () => {
  it("fetches and aggregates today's tracking data correctly", async () => {
    const { result } = renderHook(() => useTodayData(60000));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.usage).toHaveLength(2);
    expect(result.current.idleSeconds).toBe(120);
    // 3600 (Code) + 1800 (Google-chrome) = 5400
    expect(result.current.totalActiveSeconds).toBe(5400);
    expect(result.current.yesterdayActiveSeconds).toBe(5000);
    expect(result.current.error).toBeNull();
  });

  it("handles IPC failures gracefully without getting stuck in loading state", async () => {
    window.electronAPI.getToday = vi.fn().mockRejectedValue(new Error("IPC connection lost"));

    const { result } = renderHook(() => useTodayData(60000));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.usage).toEqual([]);
    expect(result.current.totalActiveSeconds).toBe(0);
  });
});
