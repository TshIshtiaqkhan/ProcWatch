import { useState, useEffect, useCallback } from "react";

export function useRangeData(startDate, endDate, refreshMs = 60000) {
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRangeData = useCallback(async () => {
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
    fetchRangeData();
    const id = setInterval(fetchRangeData, refreshMs);
    return () => clearInterval(id);
  }, [fetchRangeData, refreshMs]);

  return { usage, loading, error, refetch: fetchRangeData };
}
