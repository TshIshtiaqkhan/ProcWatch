import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { LoadingState } from "./components/ui/LoadingState";
import { MainLayout } from "./components/layout/MainLayout";
import { Today } from "./pages/Today";
import { Onboarding } from "./pages/Onboarding";

const Weekly = lazy(() => import("./pages/Weekly").then((m) => ({ default: m.Weekly })));
const Monthly = lazy(() => import("./pages/Monthly").then((m) => ({ default: m.Monthly })));
const Focus = lazy(() => import("./pages/Focus").then((m) => ({ default: m.Focus })));
const AppDetail = lazy(() => import("./pages/AppDetail").then((m) => ({ default: m.AppDetail })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));

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
    <ErrorBoundary>
      <HashRouter>
        <Suspense fallback={<LoadingState message="Loading page..." />}>
          <Routes>
            <Route
              path="/onboarding"
              element={<Onboarding onComplete={handleCompleteOnboarding} />}
            />
            <Route element={<MainLayout />}>
              <Route
                path="/"
                element={
                  isFirstRun ? <Navigate to="/onboarding" replace /> : <Navigate to="/today" replace />
                }
              />
              <Route path="/today" element={<Today />} />
              <Route path="/weekly" element={<Weekly />} />
              <Route path="/monthly" element={<Monthly />} />
              <Route path="/focus" element={<Focus />} />
              <Route path="/app/:appName" element={<AppDetail />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </ErrorBoundary>
  );
}
