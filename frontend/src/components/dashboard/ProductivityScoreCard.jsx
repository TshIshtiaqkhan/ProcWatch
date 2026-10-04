import { Flame, Target, TrendingUp, TrendingDown, CheckCircle2, Sparkles } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { formatDuration } from "../../lib/constants";

export function ProductivityScoreCard({
  score = 0,
  scoreDiff = 0,
  productiveSeconds = 0,
  distractingSeconds = 0,
  neutralSeconds = 0,
  goal = 70,
  currentStreak = 0,
  bestStreak = 0,
  goalMetToday = false,
  loading = false,
}) {
  if (loading) {
    return (
      <GlassCard
        data-testid="productivity-card-loading"
        className="p-5 flex items-center justify-center min-h-[140px] animate-pulse"
      >
        <div className="flex items-center gap-3 text-xs text-[#a1a1aa]">
          <div className="w-5 h-5 rounded-full border-2 border-[#004fff] border-t-transparent animate-spin" />
          <span>Calculating productivity metrics & streaks...</span>
        </div>
      </GlassCard>
    );
  }

  // Determine accent color and glow based on score
  let scoreColor = "#fb7185"; // rose
  let glowColor = "rgba(251,113,133,0.35)";
  let scoreGrade = "Needs Focus";

  if (score >= 75) {
    scoreColor = "#34d399"; // emerald
    glowColor = "rgba(52,211,153,0.35)";
    scoreGrade = "Highly Productive";
  } else if (score >= 50) {
    scoreColor = "#31afd4"; // cyan
    glowColor = "rgba(49,175,212,0.35)";
    scoreGrade = "Balanced Output";
  }

  // Radial progress calculations (r = 40, circumference ~ 251.32)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <GlassCard className="p-6 relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none opacity-20 blur-3xl"
        style={{ backgroundColor: scoreColor }}
      />

      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
        {/* Left Section: Radial Gauge + Score Meta */}
        <div className="flex items-center gap-5 w-full lg:w-auto">
          {/* Radial Ring */}
          <div className="relative w-[96px] h-[96px] shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
              {/* Background Track */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-zinc-800"
                strokeWidth="7"
                fill="none"
              />
              {/* Animated Progress Circle */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke={scoreColor}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                style={{
                  transition: "stroke-dashoffset 0.8s ease-out, stroke 0.4s ease",
                  filter: `drop-shadow(0 0 6px ${glowColor})`,
                }}
              />
            </svg>
            {/* Center percentage */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold font-mono text-white tracking-tight leading-none">
                {score}%
              </span>
            </div>
          </div>

          {/* Score Details */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
                Productivity Score
              </h2>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{
                  backgroundColor: `${scoreColor}15`,
                  color: scoreColor,
                  border: `1px solid ${scoreColor}30`,
                }}
              >
                {scoreGrade}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Comparison vs yesterday */}
              <div className="flex items-center gap-1 text-xs font-medium">
                {scoreDiff >= 0 ? (
                  <span className="text-[#34d399] flex items-center gap-1 font-mono">
                    <TrendingUp size={13} />▲ +{scoreDiff}% vs yesterday
                  </span>
                ) : (
                  <span className="text-[#fb7185] flex items-center gap-1 font-mono">
                    <TrendingDown size={13} />▼ {scoreDiff}% vs yesterday
                  </span>
                )}
              </div>
            </div>

            {/* Goal info */}
            <div className="flex items-center gap-2 text-[11px] text-[#71717a]">
              <Target size={12} className="text-[#31afd4]" />
              <span>Goal: {goal}%</span>
              <span>•</span>
              {goalMetToday ? (
                <span className="text-[#34d399] flex items-center gap-1 font-medium">
                  <CheckCircle2 size={12} /> Goal reached today 🎉
                </span>
              ) : (
                <span className="text-[#fbbf24] font-medium">
                  {Math.max(0, goal - score)}% to goal
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center / Right Section: Streak Counter Badge & Time Distribution */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          {/* Streak Flame Card */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 flex items-center gap-3 min-w-[150px]">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                currentStreak > 0
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700/50"
              }`}
            >
              <Flame size={20} className={currentStreak > 0 ? "animate-pulse" : ""} />
            </div>
            <div>
              <div className="text-sm font-bold text-white font-mono flex items-center gap-1">
                {currentStreak}-day streak
              </div>
              <div className="text-[10px] text-[#71717a]">
                Best: {bestStreak} day{bestStreak !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Time Distribution Chips */}
          <div className="flex flex-wrap sm:flex-col gap-1.5 justify-center">
            <div className="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-[11px] font-sans font-medium text-emerald-300">Productive:</span>
              <span className="font-semibold">{formatDuration(productiveSeconds)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1 rounded-md font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span className="text-[11px] font-sans font-medium text-rose-300">Distracting:</span>
              <span className="font-semibold">{formatDuration(distractingSeconds)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 px-3 py-1 rounded-md font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
              <span className="text-[11px] font-sans font-medium text-zinc-400">Neutral:</span>
              <span className="font-semibold">{formatDuration(neutralSeconds)}</span>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
