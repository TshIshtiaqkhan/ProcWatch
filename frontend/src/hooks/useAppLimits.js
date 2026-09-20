import { useState, useEffect, useCallback } from "react";

export function useAppLimits() {
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentAlert, setRecentAlert] = useState(null);

  const fetchLimits = useCallback(async () => {
    if (!window.electronAPI?.getLimits) {
      setLoading(false);
      return;
    }
    try {
      const result = await window.electronAPI.getLimits();
      if (result?.success && result?.data) {
        setLimits(result.data);
        setError(null);
      } else if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Failed to load app limits:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  // Listen for backend real-time updates & alerts
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubUpdated = window.electronAPI.onLimitsUpdated?.(() => {
      fetchLimits();
    });

    const unsubWarning = window.electronAPI.onLimitWarning?.((data) => {
      setRecentAlert({ ...data, type: "warning", time: Date.now() });
      fetchLimits();
    });

    const unsubExceeded = window.electronAPI.onLimitExceeded?.((data) => {
      setRecentAlert({ ...data, type: "exceeded", time: Date.now() });
      fetchLimits();
    });

    return () => {
      unsubUpdated?.();
      unsubWarning?.();
      unsubExceeded?.();
    };
  }, [fetchLimits]);

  const upsert = async (appName, limitMinutes, warnAtPercent = 80, isEnabled = true) => {
    if (!window.electronAPI?.upsertLimit) return false;
    try {
      const result = await window.electronAPI.upsertLimit(appName, limitMinutes, warnAtPercent, isEnabled);
      if (result?.success) {
        await fetchLimits();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to upsert limit:", err);
      setError(err);
      return false;
    }
  };

  const remove = async (appName) => {
    if (!window.electronAPI?.deleteLimit) return false;
    try {
      const result = await window.electronAPI.deleteLimit(appName);
      if (result?.success) {
        await fetchLimits();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to remove limit:", err);
      setError(err);
      return false;
    }
  };

  const toggle = async (appName, isEnabled) => {
    if (!window.electronAPI?.toggleLimit) return false;
    try {
      const result = await window.electronAPI.toggleLimit(appName, isEnabled);
      if (result?.success) {
        setLimits((prev) =>
          prev.map((item) =>
            item.appName.toLowerCase() === appName.toLowerCase()
              ? { ...item, isEnabled }
              : item
          )
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to toggle limit:", err);
      setError(err);
      return false;
    }
  };

  return {
    limits,
    loading,
    error,
    recentAlert,
    upsert,
    remove,
    toggle,
    refetch: fetchLimits,
  };
}
