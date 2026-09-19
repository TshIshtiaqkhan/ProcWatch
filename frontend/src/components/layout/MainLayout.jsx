import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Calendar,
  Settings,
  BarChart2,
  Activity,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  Target,
} from "lucide-react";
import confetti from "canvas-confetti";
import logo from "../../../assets/icon/256x256.png";
import { useTrackingStatus } from "../../hooks/useTrackingStatus";
import { InteractiveGridPattern } from "../ui/InteractiveGridPattern";
import { PauseSummaryModal } from "../dashboard/PauseSummaryModal";
import { useState, useEffect } from "react";

let activeCannonAnimId = null;

const triggerSideCannons = () => {
  if (activeCannonAnimId) {
    cancelAnimationFrame(activeCannonAnimId);
    activeCannonAnimId = null;
  }
  const end = Date.now() + 2.5 * 1000;
  const colors = ["#004fff", "#31afd4", "#ff007f", "#34d399", "#22d3ee"];

  const frame = () => {
    if (Date.now() > end) {
      activeCannonAnimId = null;
      return;
    }

    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 0.8 },
      colors: colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 0.8 },
      colors: colors,
    });

    activeCannonAnimId = requestAnimationFrame(frame);
  };

  activeCannonAnimId = requestAnimationFrame(frame);
};

function AlertBanner({ children }) {
  return (
    <div className="bg-[#fbbf24]/10 border-b border-[#fbbf24]/20 px-4 py-2.5 flex items-center gap-2.5 text-[#fbbf24] text-xs font-medium backdrop-blur-md">
      <AlertTriangle size={15} className="shrink-0 text-[#fbbf24]" />
      <span>{children}</span>
    </div>
  );
}

const navItems = [
  { to: "/today", label: "Today", icon: Activity },
  { to: "/weekly", label: "Week", icon: BarChart2 },
  { to: "/monthly", label: "Month", icon: Calendar },
  { to: "/focus", label: "Focus", icon: Target },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function MainLayout() {
  const { isPaused, toggle } = useTrackingStatus();
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [trackerReady, setTrackerReady] = useState(true);
  const [isWayland, setIsWayland] = useState(false);
  const location = useLocation();

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

  const isAppDetailActive = location.pathname.startsWith("/app/");

  return (
    <div className="h-screen bg-[#050505] relative overflow-hidden text-[#f4f4f5] selection:bg-[#004fff]/30">
      {/* Global Interactive Canvas Grid Backdrop */}
      <InteractiveGridPattern width={24} height={24} />

      {/* Global Constant Sidebar — fixed to prevent any layout shift */}
      <aside
        className="fixed top-0 left-0 w-[220px] h-screen flex flex-col z-20 border-r border-[#27272a]/80"
        style={{ backgroundColor: "rgba(9, 9, 11, 0.75)", backdropFilter: "blur(16px)" }}
      >
        <div className="p-5 flex items-center gap-3 border-b border-white/[0.04]">
          <img src={logo} alt="ProcWatch" className="w-[26px] h-[26px] rounded-[7px] shrink-0 shadow-[0_0_12px_rgba(0,79,255,0.35)]" />
          <div>
            <h1 className="text-[15px] font-bold text-white tracking-tight leading-none">
              ProcWatch
            </h1>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-xs font-semibold tracking-wide transition-colors border ${
                  isActive
                    ? "bg-[#004fff] text-white border-[#004fff]/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                    : "border-transparent text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/[0.045]"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          {isAppDetailActive && (
            <div className="mt-3 pt-3 border-t border-white/[0.06] px-3">
              <span className="text-[10px] font-semibold text-[#71717a] uppercase tracking-wider">Viewing App</span>
              <div className="text-xs font-medium text-[#31afd4] truncate mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#31afd4] animate-pulse" />
                App Insights
              </div>
            </div>
          )}
        </nav>

        <div className="p-3.5 mt-auto border-t border-white/[0.06]">
          <button
            onClick={async () => {
              if (isPaused) {
                triggerSideCannons(); // Trigger celebration on resuming!
                await toggle();
              } else {
                await toggle();
                setShowPauseModal(true);
              }
            }}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[10px] text-xs font-semibold border transition-all cursor-pointer ${
              isPaused
                ? "bg-[#004fff] text-white border-[#004fff]/80 shadow-[0_0_20px_rgba(0,79,255,0.45)] hover:bg-[#31afd4] hover:shadow-[0_0_20px_rgba(49,175,212,0.45)]"
                : "bg-white/[0.04] border-white/[0.09] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/[0.08]"
            }`}
          >
            {isPaused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
            {isPaused ? "Resume Tracking" : "Pause Tracking"}
          </button>
        </div>
      </aside>

      {/* Main App Content View Area — offset by sidebar width */}
      <main className="ml-[220px] h-screen overflow-y-auto z-10 relative">
        {!trackerReady && (
          <AlertBanner>
            Tracking engine inactive — active-win native module requires X11 and xdotool.
          </AlertBanner>
        )}
        {trackerReady && isWayland && (
          <AlertBanner>
            Wayland compositor active. Foreground window title detection is restricted by compositor security; idle tracking remains operational.
          </AlertBanner>
        )}
        <Outlet />
      </main>

      {/* Pause Snapshot Summary Modal */}
      <PauseSummaryModal
        isOpen={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        onResume={async () => {
          triggerSideCannons();
          await toggle();
          setShowPauseModal(false);
        }}
      />
    </div>
  );
}
