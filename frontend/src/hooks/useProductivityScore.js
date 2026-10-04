import { useState, useEffect, useCallback, useRef } from "react";

export function useProductivityScore(pollingIntervalMs = 10000) {
  const [data, setData] = useState({
    score: 0,
    scoreDiff: 0,
    productiveSeconds: 0,
    distractingSeconds: 0,
    neutralSeconds: 0,
    totalSeconds: 0,
    yesterdayScore: 0,
    goal: 70,
    currentStreak: 0,
    bestStreak: 0,
    goalMetToday: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  const fetchScore = useCallback(async () => {
    if (!window.electronAPI?.getProductivityScore) {
      if (isMountedRef.current) setLoading(false);
      return;
    }

    try {
      const res = await window.electronAPI.getProductivityScore();
      if (!isMountedRef.current) return;

      if (res?.success && res.data) {
        const d = res.data;
        setData({
          score: d.today?.score ?? 0,
          scoreDiff: d.scoreDiff ?? 0,
          productiveSeconds: d.today?.productiveSeconds ?? 0,
          distractingSeconds: d.today?.distractingSeconds ?? 0,
          neutralSeconds: d.today?.neutralSeconds ?? 0,
          totalSeconds: d.today?.totalSeconds ?? 0,
          yesterdayScore: d.yesterday?.score ?? 0,
          goal: d.goal ?? 70,
          currentStreak: d.currentStreak ?? 0,
          bestStreak: d.bestStreak ?? 0,
          goalMetToday: d.goalMetToday ?? false,
        });
        setError(null);
      } else if (res?.error) {
        setError(new Error(res.error.message || "Failed to load productivity score"));
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("Failed to fetch productivity score:", err);
      setError(err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchScore();

    const timer = setInterval(() => {
      fetchScore();
    }, pollingIntervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
    };
  }, [fetchScore, pollingIntervalMs]);

  return {
    ...data,
    loading,
    error,
    refresh: fetchScore,
  };
}
