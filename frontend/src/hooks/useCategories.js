import { useState, useEffect, useCallback } from "react";

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.listCategories();
    if (result.success && result.data) {
      setCategories(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const update = async (appName, category, isDistracting) => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.updateCategory(appName, category, isDistracting);
    if (result.success) {
      setCategories((prev) =>
        prev.map((c) =>
          c.app_name === appName ? { ...c, category, is_distracting: isDistracting ? 1 : 0 } : c
        ),
      );
    }
  };

  const setDistracting = async (appName, isDistracting) => {
    if (!window.electronAPI) return;
    const cat = categories.find((c) => c.app_name === appName);
    const result = await window.electronAPI.updateCategory(
      appName,
      cat?.category ?? "Uncategorized",
      isDistracting
    );
    if (result.success) {
      setCategories((prev) =>
        prev.map((c) =>
          c.app_name === appName ? { ...c, is_distracting: isDistracting ? 1 : 0 } : c
        ),
      );
    }
  };

  const add = async (appName, category, isDistracting = false) => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.updateCategory(appName, category, isDistracting);
    if (result.success) {
      setCategories((prev) => [...prev, { app_name: appName, category, is_distracting: isDistracting ? 1 : 0 }]);
    }
  };

  const remove = async (appName) => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.removeCategory(appName);
    if (result.success) {
      setCategories((prev) => prev.filter((c) => c.app_name !== appName));
    }
  };

  return { categories, loading, update, add, remove, setDistracting, refetch: fetch };
}
