import { NavLink, Outlet } from "react-router-dom";
import {
  Calendar,
  Settings,
  BarChart2,
  Activity,
  PlayCircle,
  PauseCircle,
  AlertTriangle
} from "lucide-react";
import confetti from "canvas-confetti";

const triggerSideCannons = () => {
  const end = Date.now() + 3 * 1000;
  const colors = ["#a855f7", "#60a5fa", "#34d399", "#fb7185", "#fbbf24"];

  const frame = () => {
    if (Date.now() > end) return;

    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 0.8 },
      colors: colors,
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 0.8 },
      colors: colors,
    });

    requestAnimationFrame(frame);
  };

  frame();
};
import { useTrackingStatus } from "../../hooks/useTrackingStatus";
import { InteractiveGridPattern } from "../ui/InteractiveGridPattern";
import { useState, useEffect } from "react";

const navItems = [
  { to: "/today", label: "Today", icon: Activity },
  { to: "/weekly", label: "Week", icon: BarChart2 },
  { to: "/monthly", label: "Month", icon: Calendar },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function MainLayout() {
  const { isPaused, toggle } = useTrackingStatus();
  const [trackerReady, setTrackerReady] = useState(true);
  const [isWayland, setIsWayland] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.isTrackerReady().then((result) => {
      if (result.success && result.data) {
        setTrackerReady(result.data.ready);
      }
    });
    window.electronAPI.checkDeps().then((result) => {
      if (result.success && result.data) {
        setIsWayland(result.data.isWayland);
      }
    });
  }, []);

  return (
    <div className="flex h-screen bg-[#050505] relative overflow-hidden text-[#f4f4f5]">
      {/* Global Canvas Interactive Grid Backdrop with Blue Dots */}
      <InteractiveGridPattern width={24} height={24} />

      {/* Global Constant Sidebar */}
      <aside
        className="w-[220px] flex flex-col z-10 border-r border-white/[0.09] shrink-0"
        style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(14px)" }}
      >
        <div className="p-6 flex items-center gap-2.5">
          <div className="w-[26px] h-[26px] rounded-[7px] bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center text-white shrink-0 shadow-md">
            <Activity size={15} />
          </div>
          <h1 className="text-base font-bold text-white tracking-tight leading-none">
            ScreenTrack
          </h1>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500/25 to-blue-500/5 text-[#60a5fa] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35)]"
                    : "text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/[0.045]"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-white/[0.09]">
          <button
            onClick={() => {
              if (!isPaused) {
                triggerSideCannons();
              }
              toggle();
            }}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[10px] text-sm font-semibold border transition-all ${
              isPaused
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
            }`}
          >
            {isPaused ? <PlayCircle size={17} /> : <PauseCircle size={17} />}
            {isPaused ? "Resume Tracking" : "Pause Tracking"}
          </button>
        </div>
      </aside>

      {/* Main App Content View Area */}
      <main className="flex-1 overflow-y-auto z-10 relative">
        {!trackerReady && (
          <div className="bg-yellow-900/30 border-b border-yellow-700/50 px-4 py-2 flex items-center gap-2 text-yellow-300 text-sm">
            <AlertTriangle size={16} />
            Tracking is unavailable — active-win module failed to load. Window detection requires X11 and xdotool.
          </div>
        )}
        {trackerReady && isWayland && (
          <div className="bg-yellow-900/30 border-b border-yellow-700/50 px-4 py-2 flex items-center gap-2 text-yellow-300 text-sm">
            <AlertTriangle size={16} />
            Wayland session detected. Active window tracking is unavailable due to Wayland security restrictions; only idle tracking is active.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}

