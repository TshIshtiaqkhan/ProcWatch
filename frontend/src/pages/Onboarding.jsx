import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Shield,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Activity,
} from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";

const STEPS = [
  {
    icon: Activity,
    title: "Welcome to ProcWatch",
    subtitle: "Automated & Lightweight Application Tracking",
    description:
      "ProcWatch seamlessly monitors which apps you use and for how long in the background — fully automatic, silent, and zero manual input needed.",
  },
  {
    icon: HardDrive,
    title: "100% Local & Private",
    subtitle: "Your Data Stays on Your Machine",
    description:
      "All activity and metrics stay strictly local in your SQLite database. Zero cloud sync, zero telemetry, and no account required.",
  },
  {
    icon: Shield,
    title: "Privacy & Precision",
    subtitle: "Smart Idle Detection & Performance",
    description:
      "Sampling-based tracking with automatic idle detection (90s default threshold). Fully offline, memory-efficient, and privacy respecting.",
  },
];

export function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [deps, setDeps] = useState(null);
  const [copied, setCopied] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.electronAPI?.checkDeps) return;
    window.electronAPI.checkDeps().then((result) => {
      if (result?.success && result?.data) {
        setDeps(result.data);
      }
    });
  }, []);

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      if (window.electronAPI?.completeOnboarding) {
        await window.electronAPI.completeOnboarding();
      }
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
    } finally {
      if (typeof onComplete === "function") {
        onComplete();
      }
      navigate("/today", { replace: true });
      setFinishing(false);
    }
  };

  const copyCommand = (cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const current = STEPS[step];
  if (!current) return null;
  const StepIcon = current.icon;

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#09090b] text-[#f4f4f5] p-6 selection:bg-[#004fff]/30">
      <div className="w-full max-w-xl">
        {/* Progress dots */}
        <div className="flex justify-center items-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-8 bg-[#004fff] shadow-[0_0_10px_rgba(0,79,255,0.6)]"
                  : i < step
                  ? "w-2 bg-[#31afd4]/60"
                  : "w-2 bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Main Card */}
        <GlassCard className="p-8 shadow-2xl relative overflow-hidden border-[#27272a]">
          {/* Header & Icon */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#004fff]/15 border border-[#004fff]/30 mb-4 shadow-[0_0_25px_rgba(0,79,255,0.25)]">
              <StepIcon size={26} className="text-[#31afd4]" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1.5">
              {current.title}
            </h1>
            <p className="text-xs font-semibold text-[#31afd4] mb-3 uppercase tracking-wider">
              {current.subtitle}
            </p>
            <p className="text-xs text-[#a1a1aa] leading-relaxed max-w-md mx-auto">
              {current.description}
            </p>
          </div>

          {/* Dependency check (shown on step 0) */}
          {step === 0 && deps && (
            deps.platform === "win32" ? (
              <div className="bg-[#18181b]/80 border border-[#27272a] rounded-xl p-4 mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[#f4f4f5] uppercase tracking-wider">
                    Platform Engine (Windows)
                  </h3>
                  <span className="text-[11px] text-[#34d399] uppercase font-mono font-semibold">
                    Native Win32
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  <DepStatus label="Active Window Engine" ok={true} desc="Direct Win32 foreground API tracking" />
                  <DepStatus label="Idle Detection" ok={true} desc="Windows hardware idle state monitor" />
                </div>
              </div>
            ) : (
              <div className="bg-[#18181b]/80 border border-[#27272a] rounded-xl p-4 mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[#f4f4f5] uppercase tracking-wider">
                    System Dependencies (Linux X11)
                  </h3>
                  <span className="text-[11px] text-[#71717a] uppercase font-mono">
                    {deps.sessionType || "X11"}
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <DepStatus label="xdotool" ok={deps.xdotool} desc="Active window title & focus detection" />
                  <DepStatus label="wmctrl" ok={deps.wmctrl} desc="Window manager & class identification" />
                </div>

                {deps.isWayland && (
                  <div className="flex items-start gap-2 text-[#fbbf24] text-xs mt-2 p-2.5 rounded-lg bg-[#fbbf24]/10 border border-[#fbbf24]/20">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#fbbf24]" />
                    <span>
                      Wayland detected — foreground window title queries are restricted by compositor security. Idle detection remains active.
                    </span>
                  </div>
                )}

                {(!deps.xdotool || !deps.wmctrl) && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs text-[#a1a1aa] space-y-2">
                    <p className="text-xs font-medium text-[#f4f4f5]">
                      Install missing dependencies for active window tracking:
                    </p>

                    <div className="flex items-center justify-between bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 font-mono text-xs text-[#31afd4]">
                      <code>sudo apt install -y xdotool wmctrl</code>
                      <button
                        onClick={() => copyCommand("sudo apt install -y xdotool wmctrl")}
                        className="ml-2 p-1 text-[#71717a] hover:text-white transition-colors cursor-pointer"
                        title="Copy command"
                      >
                        {copied ? <Check size={14} className="text-[#34d399]" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              className={`flex items-center gap-1 text-xs font-medium text-[#71717a] hover:text-[#f4f4f5] transition-colors cursor-pointer ${
                step === 0 ? "invisible" : ""
              }`}
            >
              <ChevronLeft size={16} />
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#004fff] hover:bg-[#31afd4] text-white rounded-lg text-xs font-semibold transition-all shadow-[0_0_20px_rgba(0,79,255,0.35)] hover:shadow-[0_0_25px_rgba(49,175,212,0.45)] cursor-pointer"
              >
                Next
                <ChevronRight size={15} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#004fff] hover:bg-[#31afd4] text-white rounded-lg text-xs font-semibold transition-all shadow-[0_0_25px_rgba(0,79,255,0.45)] hover:shadow-[0_0_30px_rgba(49,175,212,0.55)] cursor-pointer"
              >
                Get Started
                <ChevronRight size={15} />
              </button>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function DepStatus({ label, ok, desc }) {
  return (
    <div className="flex items-center justify-between text-xs py-1 px-1.5 rounded-md hover:bg-white/[0.02]">
      <div className="flex items-center gap-2.5">
        {ok ? (
          <CheckCircle size={15} className="text-[#34d399] shrink-0" />
        ) : (
          <XCircle size={15} className="text-[#fb7185] shrink-0" />
        )}
        <div>
          <span className={`font-mono font-medium ${ok ? "text-[#f4f4f5]" : "text-[#fb7185]"}`}>{label}</span>
          {desc && <span className="text-[11px] text-[#71717a] ml-2 hidden sm:inline">{desc}</span>}
        </div>
      </div>
      <span
        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
          ok
            ? "text-[#34d399] bg-[#34d399]/10 border-[#34d399]/20"
            : "text-[#fb7185] bg-[#fb7185]/10 border-[#fb7185]/20"
        }`}
      >
        {ok ? "Found" : "Missing"}
      </span>
    </div>
  );
}
