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

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [deps, setDeps] = useState(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.checkDeps().then((result) => {
      if (result.success && result.data) {
        setDeps(result.data);
      }
    });
  }, []);

  const handleFinish = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.completeOnboarding();
    navigate("/today");
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
    <div className="flex items-center justify-center min-h-screen bg-[#09090b] text-[#f4f4f5] p-6 selection:bg-[#6366f1]/30">
      <div className="w-full max-w-xl">
        {/* Progress dots */}
        <div className="flex justify-center items-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-8 bg-[#6366f1]"
                  : i < step
                  ? "w-2 bg-[#818cf8]/50"
                  : "w-2 bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Main Card */}
        <GlassCard className="p-8 shadow-2xl relative overflow-hidden border-white/[0.12]">
          {/* Header & Icon */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#6366f1]/10 border border-[#6366f1]/20 mb-4 shadow-[0_0_25px_rgba(99,102,241,0.15)]">
              <StepIcon size={26} className="text-[#818cf8]" />
            </div>
            <h1 className="text-2xl font-bold text-[#f4f4f5] tracking-tight mb-1.5">
              {current.title}
            </h1>
            <p className="text-[13px] font-medium text-[#818cf8] mb-3">
              {current.subtitle}
            </p>
            <p className="text-[14px] text-[#a1a1aa] leading-relaxed max-w-md mx-auto">
              {current.description}
            </p>
          </div>

          {/* Dependency check (shown on step 0) */}
          {step === 0 && deps && (
            <div className="bg-[#18181b]/80 border border-white/[0.08] rounded-xl p-4 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-[#f4f4f5]">
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
                <div className="flex items-start gap-2 text-[#fbbf24] text-[12px] mt-2 p-2.5 rounded-lg bg-[#fbbf24]/10 border border-[#fbbf24]/20">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#fbbf24]" />
                  <span>
                    Wayland detected — foreground window queries may be restricted by compositor security. Idle detection remains active.
                  </span>
                </div>
              )}

              {(!deps.xdotool || !deps.wmctrl) && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs text-[#a1a1aa] space-y-2">
                  <p className="text-[12px] font-medium text-[#e4e4e7]">
                    Install missing dependencies for active tracking:
                  </p>
                  
                  <div className="flex items-center justify-between bg-[#09090b]/80 border border-white/[0.1] rounded-lg px-3 py-2 font-mono text-[12px] text-[#818cf8]">
                    <code>sudo apt install -y xdotool wmctrl</code>
                    <button
                      onClick={() => copyCommand("sudo apt install -y xdotool wmctrl")}
                      className="ml-2 p-1 text-[#71717a] hover:text-[#f4f4f5] transition-colors"
                      title="Copy command"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <details className="text-[11px] text-[#71717a] cursor-pointer pt-1">
                    <summary className="hover:text-[#a1a1aa] transition-colors">Other Linux distributions</summary>
                    <div className="mt-2 space-y-1.5 pl-2 font-mono">
                      <div className="text-[11px] text-[#a1a1aa]">Fedora / RHEL: <code className="text-[#818cf8]">sudo dnf install xdotool wmctrl</code></div>
                      <div className="text-[11px] text-[#a1a1aa]">Arch / Manjaro: <code className="text-[#818cf8]">sudo pacman -S xdotool wmctrl</code></div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              className={`flex items-center gap-1 text-[13px] text-[#71717a] hover:text-[#f4f4f5] transition-colors ${
                step === 0 ? "invisible" : ""
              }`}
            >
              <ChevronLeft size={16} />
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg text-[13px] font-medium transition-all shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]"
              >
                Next
                <ChevronRight size={15} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg text-[13px] font-semibold transition-all shadow-[0_0_25px_rgba(99,102,241,0.35)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]"
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
          <CheckCircle size={15} className="text-emerald-400 shrink-0" />
        ) : (
          <XCircle size={15} className="text-rose-400 shrink-0" />
        )}
        <div>
          <span className={`font-mono font-medium ${ok ? "text-[#f4f4f5]" : "text-rose-200"}`}>{label}</span>
          {desc && <span className="text-[11px] text-[#71717a] ml-2 hidden sm:inline">{desc}</span>}
        </div>
      </div>
      <span
        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
          ok
            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            : "text-rose-400 bg-rose-500/10 border-rose-500/20"
        }`}
      >
        {ok ? "Found" : "Missing"}
      </span>
    </div>
  );
}
