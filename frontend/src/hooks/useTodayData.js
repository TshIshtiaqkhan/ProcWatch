import { useState, useEffect, useCallback } from "react";
import { todayDateString } from "../lib/constants";

export function useTodayData(refreshMs = 30000) {
  const [usage, setUsage] = useState([]);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [yesterdayActiveSeconds, setYesterdayActiveSeconds] = useState(0);
  const [yesterdayIdleSeconds, setYesterdayIdleSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(todayDateString());

  const fetch = useCallback(async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.getToday();
    if (result.success && result.data) {
      setUsage(result.data.apps);
      setIdleSeconds(result.data.idleSeconds);
      setYesterdayActiveSeconds(result.data.yesterdayActiveSeconds || 0);
      setYesterdayIdleSeconds(result.data.yesterdayIdleSeconds || 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, refreshMs);
    return () => clearInterval(id);
  }, [fetch, refreshMs]);

  // Detect midnight rollover
  useEffect(() => {
    const check = () => {
      const now = todayDateString();
      if (now !== currentDate) {
        setCurrentDate(now);
        setLoading(true);
        fetch();
      }
    };
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, [currentDate, fetch]);

  const totalActiveSeconds = usage.reduce((sum, u) => sum + u.seconds, 0);
  return {
    usage,
    totalActiveSeconds,
    idleSeconds,
    yesterdayActiveSeconds,
    yesterdayIdleSeconds,
    loading,
    refetch: fetch,
  };
}
