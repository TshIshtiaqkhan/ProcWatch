import { useState, useEffect, useCallback } from "react";

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    if (!window.electronAPI) {
      setLoading(false);
      return;
    }
    try {
      const result = await window.electronAPI.listCategories();
      if (result?.success && result?.data) {
        setCategories(result.data);
        setError(null);
      } else if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const update = async (appName, category, isDistracting) => {
    if (!window.electronAPI) return false;
    try {
      const result = await window.electronAPI.updateCategory(appName, category, isDistracting);
      if (result?.success) {
        setCategories((prev) =>
          prev.map((c) =>
            c.app_name === appName ? { ...c, category, is_distracting: isDistracting ? 1 : 0 } : c
          ),
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to update category:", err);
      setError(err);
      return false;
    }
  };

  const setDistracting = async (appName, isDistracting) => {
    if (!window.electronAPI) return false;
    const cat = categories.find((c) => c.app_name === appName);
    try {
      const result = await window.electronAPI.updateCategory(
        appName,
        cat?.category ?? "Uncategorized",
        isDistracting
      );
      if (result?.success) {
        setCategories((prev) =>
          prev.map((c) =>
            c.app_name === appName ? { ...c, is_distracting: isDistracting ? 1 : 0 } : c
          ),
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to set distraction flag:", err);
      setError(err);
      return false;
    }
  };

  const add = async (appName, category, isDistracting = false) => {
    if (!window.electronAPI) return false;
    try {
      const result = await window.electronAPI.updateCategory(appName, category, isDistracting);
      if (result?.success) {
        setCategories((prev) => [...prev, { app_name: appName, category, is_distracting: isDistracting ? 1 : 0 }]);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to add category:", err);
      setError(err);
      return false;
    }
  };

  const remove = async (appName) => {
    if (!window.electronAPI) return false;
    try {
      const result = await window.electronAPI.removeCategory(appName);
      if (result?.success) {
        setCategories((prev) => prev.filter((c) => c.app_name !== appName));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to remove category:", err);
      setError(err);
      return false;
    }
  };

  return { categories, loading, error, update, add, remove, setDistracting, refetch: fetchCategories };
}
