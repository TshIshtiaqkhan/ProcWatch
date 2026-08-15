import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { Today } from "./pages/Today";
import { Weekly } from "./pages/Weekly";
import { Monthly } from "./pages/Monthly";
import { AppDetail } from "./pages/AppDetail";
import { Settings } from "./pages/Settings";
import { Onboarding } from "./pages/Onboarding";

export default function App() {
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.isFirstRun) {
      setChecked(true);
      return;
    }
    window.electronAPI
      .isFirstRun()
      .then((result) => {
        if (result?.success && result?.data) {
          setIsFirstRun(Boolean(result.data.isFirstRun));
        }
        setChecked(true);
      })
      .catch((err) => {
        console.error("Error checking isFirstRun:", err);
        setChecked(true);
      });
  }, []);

  const handleCompleteOnboarding = () => {
    setIsFirstRun(false);
  };

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#09090b]">
        <div className="text-[#a1a1aa] font-medium text-sm animate-pulse">Loading ProcWatch...</div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/onboarding"
          element={<Onboarding onComplete={handleCompleteOnboarding} />}
        />
        <Route element={<MainLayout />}>
          <Route
            path="/"
            element={
              isFirstRun ? <Navigate to="/onboarding" replace /> : <Today />
            }
          />
          <Route path="/today" element={<Today />} />
          <Route path="/weekly" element={<Weekly />} />
          <Route path="/monthly" element={<Monthly />} />
          <Route path="/app/:appName" element={<AppDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
