import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAppLimits } from "../hooks/useAppLimits";

describe("useAppLimits hook", () => {
  it("fetches limits on mount", async () => {
    const { result } = renderHook(() => useAppLimits());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.limits).toHaveLength(1);
    expect(result.current.limits[0].appName).toBe("chrome");
    expect(result.current.limits[0].limitMinutes).toBe(60);
  });

  it("handles toggling limit status", async () => {
    const { result } = renderHook(() => useAppLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.toggle("chrome", false);
    });

    expect(success).toBe(true);
    expect(result.current.limits[0].isEnabled).toBe(false);
  });

  it("calls deleteLimit and refetches", async () => {
    const { result } = renderHook(() => useAppLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.remove("chrome");
    });

    expect(window.electronAPI.deleteLimit).toHaveBeenCalledWith("chrome");
  });
});
