import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useProductivityScore } from "../hooks/useProductivityScore";

describe("useProductivityScore hook", () => {
  it("fetches productivity score and streak metrics successfully", async () => {
    const { result } = renderHook(() => useProductivityScore(60000));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.score).toBe(82);
    expect(result.current.scoreDiff).toBe(7);
    expect(result.current.currentStreak).toBe(4);
    expect(result.current.bestStreak).toBe(7);
    expect(result.current.goalMetToday).toBe(true);
    expect(result.current.goal).toBe(70);
    expect(result.current.productiveSeconds).toBe(7200);
    expect(result.current.distractingSeconds).toBe(1600);
    expect(result.current.neutralSeconds).toBe(800);
    expect(result.current.error).toBeNull();
  });

  it("handles IPC failures gracefully without perpetual loading state", async () => {
    window.electronAPI.getProductivityScore = vi
      .fn()
      .mockRejectedValue(new Error("IPC connection lost"));

    const { result } = renderHook(() => useProductivityScore(60000));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.score).toBe(0);
    expect(result.current.currentStreak).toBe(0);
  });
});
