import { useState, useEffect, useCallback } from "react";

export function useSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    if (!window.electronAPI) {
      setLoading(false);
      return;
    }
    try {
      const result = await window.electronAPI.getSettings();
      if (result?.success && result?.data) {
        setSettings(result.data);
        setError(null);
      } else if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const update = async (updates) => {
    if (!window.electronAPI) return false;
    try {
      const result = await window.electronAPI.updateSettings(updates);
      if (result?.success) {
        setSettings((prev) => ({ ...prev, ...updates }));
        return true;
      } else if (result?.error) {
        setError(result.error);
        return false;
      }
    } catch (err) {
      console.error("Failed to update settings:", err);
      setError(err);
      return false;
    }
  };

  return { settings, loading, error, update, refetch: fetchSettings };
}
