import { useState, useEffect } from "react";
import { Coffee, SkipForward, Plus, Sparkles, RefreshCw, CheckCircle2 } from "lucide-react";

const WELLNESS_TIPS = [
  {
    title: "20-20-20 Rule",
    text: "Look at an object at least 20 feet away for 20 seconds to relieve digital eye strain.",
  },
  {
    title: "Hydrate & Recharge",
    text: "Drink a tall glass of cold water to refresh your mind and maintain cellular focus.",
  },
  {
    title: "Stretch & Posture",
    text: "Roll your shoulders back, stretch your wrists and neck, and uncross your legs.",
  },
  {
    title: "Mindful Breath",
    text: "Take 4 slow, deep belly breaths: inhale for 4 seconds, hold for 4, exhale for 6.",
  },
  {
    title: "Stand & Walk",
    text: "Stand up from your desk and walk around your room to stimulate circulation.",
  },
];

export function BreakOverlay({
  isOpen = false,
  remainingSeconds = 300,
  totalSeconds = 300,
  onSkip,
  onExtend,
  onComplete,
}) {
  const [tipIndex, setTipIndex] = useState(0);

  // Rotate tips every 20 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % WELLNESS_TIPS.length);
    }, 20000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const mins = Math.floor(Math.max(0, remainingSeconds) / 60);
  const secs = Math.max(0, remainingSeconds) % 60;
  const timeDisplay = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const currentTip = WELLNESS_TIPS[tipIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-2xl bg-black/85 animate-fadeIn">
      {/* Ambient background glow */}
      <div className="absolute w-[450px] h-[450px] bg-[#31afd4]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full bg-[#111114]/90 border border-white/10 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-center space-y-6">
        {/* Header Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#31afd4]/15 border border-[#31afd4]/30 text-[#31afd4] text-xs font-semibold uppercase tracking-wider">
          <Coffee size={14} className="animate-bounce" />
          <span>Break Time</span>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Rest Your Mind & Body
          </h2>
          <p className="text-xs text-[#a1a1aa] mt-1">
            Step away from the screen. Your eyes and brain thank you.
          </p>
        </div>

        {/* Circular Countdown Timer */}
        <div className="relative w-[180px] h-[180px] mx-auto flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 180 180">
            {/* Background Track */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              className="stroke-zinc-800"
              strokeWidth="6"
              fill="none"
            />
            {/* Animated Progress Circle */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke="#31afd4"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              style={{
                transition: "stroke-dashoffset 1s linear",
                filter: "drop-shadow(0 0 10px rgba(49,175,212,0.5))",
              }}
            />
          </svg>

          {/* Time in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight leading-none">
              {timeDisplay}
            </span>
            <span className="text-[11px] text-[#71717a] mt-1 font-medium">remaining</span>
          </div>
        </div>

        {/* Wellness Tip Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 text-left space-y-1.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#31afd4] uppercase tracking-wider">
              <Sparkles size={12} />
              <span>Wellness Tip</span>
            </div>
            <button
              type="button"
              onClick={() => setTipIndex((prev) => (prev + 1) % WELLNESS_TIPS.length)}
              className="text-[#71717a] hover:text-white transition-colors cursor-pointer p-1"
              title="Next tip"
            >
              <RefreshCw size={12} />
            </button>
          </div>
          <div className="text-xs font-bold text-white">{currentTip.title}</div>
          <div className="text-xs text-[#a1a1aa] leading-relaxed">{currentTip.text}</div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onExtend}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-[#f4f4f5] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>+5 Min</span>
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#004fff] hover:bg-[#31afd4] border border-[#004fff]/60 shadow-[0_0_15px_rgba(0,79,255,0.4)] transition-all cursor-pointer"
          >
            <SkipForward size={14} />
            <span>Skip Break</span>
          </button>
        </div>
      </div>
    </div>
  );
}
