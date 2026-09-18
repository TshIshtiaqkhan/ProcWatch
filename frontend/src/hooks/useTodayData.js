import { useState, useEffect, useCallback } from "react";
import { todayDateString } from "../lib/constants";

export function useTodayData(refreshMs = 30000) {
  const [usage, setUsage] = useState([]);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [yesterdayActiveSeconds, setYesterdayActiveSeconds] = useState(0);
  const [yesterdayIdleSeconds, setYesterdayIdleSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(todayDateString());

  const fetchTodayData = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.getToday();
      if (result.success && result.data) {
        setUsage(result.data.apps);
        setIdleSeconds(result.data.idleSeconds);
        setYesterdayActiveSeconds(result.data.yesterdayActiveSeconds || 0);
        setYesterdayIdleSeconds(result.data.yesterdayIdleSeconds || 0);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch today's data:", err);
      setError(err);
    } finally {
      // Always clear the loading flag — previously this was only reached on
      // success, leaving the UI stuck in loading state on IPC failure.
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayData();
    const id = setInterval(fetchTodayData, refreshMs);
    return () => clearInterval(id);
  }, [fetchTodayData, refreshMs]);

  // Detect midnight rollover and reload
  useEffect(() => {
    const check = () => {
      const now = todayDateString();
      if (now !== currentDate) {
        setCurrentDate(now);
        setLoading(true);
        fetchTodayData();
      }
    };
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, [currentDate, fetchTodayData]);

  const totalActiveSeconds = usage.reduce((sum, u) => sum + u.seconds, 0);

  return {
    usage,
    totalActiveSeconds,
    idleSeconds,
    yesterdayActiveSeconds,
    yesterdayIdleSeconds,
    loading,
    error,
    refetch: fetchTodayData,
  };
}
