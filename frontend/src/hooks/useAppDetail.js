import { useState, useEffect, useCallback } from "react";

export function useAppDetail(appName, startDate, endDate) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetail = useCallback(async () => {
    if (!window.electronAPI) {
      setLoading(false);
      return;
    }
    try {
      const result = await window.electronAPI.getAppDetail(
        appName,
        startDate,
        endDate,
      );
      if (result?.success && result?.data) {
        setDetail(result.data);
        setError(null);
      } else if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Failed to fetch app detail:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [appName, startDate, endDate]);

  useEffect(() => {
    fetchDetail();
    const id = setInterval(fetchDetail, 30000);
    return () => clearInterval(id);
  }, [fetchDetail]);

  return { detail, loading, error, refetch: fetchDetail };
}
