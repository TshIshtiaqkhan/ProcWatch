import { useState, useEffect, useRef, useCallback } from "react";

export function useFocusSession() {
  const [state, setState] = useState("idle"); // 'idle' | 'running' | 'break' | 'completed'
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [distractions, setDistractions] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [sessionId, setSessionId] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const countdownRef = useRef(null);
  const unsubDistractRef = useRef(null);
  const unsubCompleteRef = useRef(null);

  // ── Countdown Timer ─────────────────────────────────────────────────────────

  const startCountdown = useCallback((seconds) => {
    setRemainingSeconds(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // ── Event Listeners ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!window.electronAPI) return;

    // Listen for distraction events from main process
    unsubDistractRef.current = window.electronAPI.onFocusDistraction?.((data) => {
      if (typeof data?.distractions === "number") {
        setDistractions(data.distractions);
      } else {
        setDistractions((prev) => prev + 1);
      }
    });

    // Listen for session completion from main process
    unsubCompleteRef.current = window.electronAPI.onFocusCompleted?.((data) => {
      stopCountdown();
      setLastResult(data);
      setState("completed");
      setSessionId(null);
    });

    return () => {
      unsubDistractRef.current?.();
      unsubCompleteRef.current?.();
    };
  }, [stopCountdown]);

  // ── Periodic Sync while Running ─────────────────────────────────────────────

  useEffect(() => {
    if (state !== "running") return;
    const syncInterval = setInterval(() => {
      if (!window.electronAPI?.getFocusStatus) return;
      window.electronAPI.getFocusStatus().then((res) => {
        if (res?.success && res.data?.state === "running") {
          setDistractions(res.data.distractions);
        }
      });
    }, 2000);
    return () => clearInterval(syncInterval);
  }, [state]);

  // ── Sync with backend on mount ──────────────────────────────────────────────

  useEffect(() => {
    if (!window.electronAPI?.getFocusStatus) return;
    window.electronAPI.getFocusStatus().then((res) => {
      if (res?.success && res.data?.state === "running") {
        setState("running");
        setRemainingSeconds(res.data.remainingSeconds);
        setDistractions(res.data.distractions);
        setDurationMinutes(res.data.durationMinutes);
        setSessionId(res.data.sessionId);
        startCountdown(res.data.remainingSeconds);
      }
    });
  }, [startCountdown]);

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => stopCountdown();
  }, [stopCountdown]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const start = useCallback(async (minutes) => {
    if (!window.electronAPI?.startFocus) return;
    const duration = minutes || durationMinutes;
    const res = await window.electronAPI.startFocus(duration);
    if (res?.success && res.data) {
      setDurationMinutes(duration);
      setSessionId(res.data.sessionId);
      setDistractions(0);
      setLastResult(null);
      setState("running");
      startCountdown(duration * 60);
    }
  }, [durationMinutes, startCountdown]);

  const stop = useCallback(async () => {
    if (!window.electronAPI?.stopFocus) return;
    stopCountdown();
    const res = await window.electronAPI.stopFocus();
    if (res?.success) {
      setLastResult(null);
      setState("idle");
      setSessionId(null);
      setRemainingSeconds(0);
      setDistractions(0);
    }
  }, [stopCountdown]);

  const dismissResult = useCallback(() => {
    setLastResult(null);
    setState("idle");
  }, []);

  const startBreak = useCallback((breakMinutes) => {
    const mins = breakMinutes || 5;
    setState("break");
    startCountdown(mins * 60);
  }, [startCountdown]);

  const skipBreak = useCallback(() => {
    stopCountdown();
    setRemainingSeconds(0);
    setState("idle");
    setLastResult(null);
  }, [stopCountdown]);

  return {
    state,
    remainingSeconds,
    distractions,
    durationMinutes,
    sessionId,
    lastResult,
    start,
    stop,
    dismissResult,
    startBreak,
    skipBreak,
  };
}
