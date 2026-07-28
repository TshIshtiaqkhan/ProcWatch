import { HashRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { Today } from "./pages/Today";
import { Weekly } from "./pages/Weekly";
import { Monthly } from "./pages/Monthly";
import { AppDetail } from "./pages/AppDetail";
import { Settings } from "./pages/Settings";
import { Onboarding } from "./pages/Onboarding";

function AppContent({ isFirstRun }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (isFirstRun) {
      navigate("/onboarding", { replace: true });
    }
  }, [isFirstRun, navigate]);

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<Today />} />
        <Route path="/today" element={<Today />} />
        <Route path="/weekly" element={<Weekly />} />
        <Route path="/monthly" element={<Monthly />} />
        <Route path="/app/:appName" element={<AppDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) {
      setChecked(true);
      return;
    }
    window.electronAPI.isFirstRun().then((result) => {
      if (result.success && result.data) {
        setIsFirstRun(result.data.isFirstRun);
      }
      setChecked(true);
    });
  }, []);

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <HashRouter>
      <AppContent isFirstRun={isFirstRun} />
    </HashRouter>
  );
}
