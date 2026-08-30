import { useState, useEffect, useCallback } from "react";

export function useRangeData(startDate, endDate, refreshMs = 60000) {
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.getRange(startDate, endDate);
      if (result.success && result.data) {
        setUsage(result.data);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch range data:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, refreshMs);
    return () => clearInterval(id);
  }, [fetch, refreshMs]);

  return { usage, loading, error, refetch: fetch };
}
