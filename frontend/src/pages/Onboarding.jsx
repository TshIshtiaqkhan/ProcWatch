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
} from "lucide-react";

const STEPS = [
  {
    icon: Clock,
    title: "Track Your Screen Time",
    description:
      "ProcWatch monitors which apps you use and for how long — automatically, in the background. No manual input needed.",
  },
  {
    icon: HardDrive,
    title: "100% Local & Offline",
    description:
      "All data stays on your machine. Nothing is sent to the cloud, no accounts required, no telemetry. Your data is stored locally in SQLite.",
  },
  {
    icon: Shield,
    title: "Privacy & Limitations",
    description:
      "Runs offline. Tracking is sampling-based (checks every 5s). Staring at code/videos without input for 90s registers as idle. On Wayland, only idle tracking is active due to Wayland security.",
  },
];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [deps, setDeps] = useState(null);
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

  const current = STEPS[step];
  if (!current) return null;
  const StepIcon = current.icon;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="w-full max-w-lg px-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-10">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step
                  ? "w-8 bg-indigo-500"
                  : i < step
                    ? "w-2 bg-indigo-400"
                    : "w-2 bg-gray-700"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 mb-6">
            <StepIcon size={32} className="text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            {current.title}
          </h1>
          <p className="text-gray-400 leading-relaxed">{current.description}</p>
        </div>

        {/* Dependency check (shown on step 0) */}
        {step === 0 && deps && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 space-y-3">
            <h3 className="text-sm font-medium text-gray-300">
              System Dependencies
            </h3>
            <DepStatus label="xdotool" ok={deps.xdotool} />
            <DepStatus label="wmctrl" ok={deps.wmctrl} />
            {deps.isWayland && (
              <div className="flex items-start gap-2 text-yellow-400 text-sm mt-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  Wayland detected — active window tracking may not work
                  reliably. Idle detection still works.
                </span>
              </div>
            )}
            {(!deps.xdotool || !deps.wmctrl) && (
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <p>Install missing dependencies:</p>
                <code className="block bg-gray-800 px-2 py-1 rounded text-gray-300">
                  sudo apt install xdotool wmctrl
                </code>
                <code className="block bg-gray-800 px-2 py-1 rounded text-gray-300">
                  sudo dnf install xdotool wmctrl
                </code>
                <code className="block bg-gray-800 px-2 py-1 rounded text-gray-300">
                  sudo pacman -S xdotool wmctrl
                </code>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            className={`text-sm text-gray-500 hover:text-gray-300 transition-colors ${
              step === 0 ? "invisible" : ""
            }`}
          >
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Get Started
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DepStatus({ label, ok }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle size={16} className="text-green-400 shrink-0" />
      ) : (
        <XCircle size={16} className="text-red-400 shrink-0" />
      )}
      <span className={ok ? "text-gray-300" : "text-red-300"}>{label}</span>
      <span
        className={`text-xs ml-auto ${ok ? "text-green-500" : "text-red-500"}`}
      >
        {ok ? "Found" : "Missing"}
      </span>
    </div>
  );
}
