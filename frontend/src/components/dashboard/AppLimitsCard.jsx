import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, Plus, ShieldAlert } from "lucide-react";
import { AppIcon } from "../ui/AppIcon";
import { GlassCard } from "../ui/GlassCard";
import { formatDuration } from "../../lib/constants";

export function AppLimitsCard({ limits = [], loading = false }) {
  if (loading) {
    return (
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-4">
          <Clock size={14} className="text-[#31afd4]" />
          <span>Daily App Limits & Budgets</span>
        </div>
        <div className="h-20 flex items-center justify-center text-xs text-[#71717a] animate-pulse font-mono">
          Loading daily budgets...
        </div>
      </GlassCard>
    );
  }

  // Filter to active/configured limits
  const activeLimits = limits.filter((l) => l.isEnabled);

  return (
    <GlassCard className="p-5 space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[#31afd4]" />
          <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
            Daily App Budgets & Limits
          </h2>
        </div>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#31afd4] hover:text-white transition-colors cursor-pointer"
        >
          <Plus size={13} />
          <span>Manage Limits</span>
        </Link>
      </div>

      {limits.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] space-y-2">
          <ShieldAlert size={24} className="mx-auto text-[#71717a]" />
          <p className="text-xs font-semibold text-[#f4f4f5]">No daily app limits configured</p>
          <p className="text-[11px] text-[#71717a] max-w-sm mx-auto leading-relaxed">
            Set daily time limits for distracting apps to get proactive notifications before you lose track of time.
          </p>
          <div className="pt-2">
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#004fff] hover:bg-[#31afd4] shadow-[0_0_12px_rgba(0,79,255,0.35)] transition-all cursor-pointer"
            >
              <Plus size={13} />
              Set First Limit
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {limits.map((item) => {
            const limitSeconds = item.limitMinutes * 60;
            const usedSeconds = item.todaySeconds || 0;
            const remainingSeconds = Math.max(0, limitSeconds - usedSeconds);
            const overSeconds = Math.max(0, usedSeconds - limitSeconds);
            const pct = Math.min(100, Math.round((usedSeconds / limitSeconds) * 100));

            // Status calculations
            const isExceeded = usedSeconds >= limitSeconds;
            const isWarn = pct >= item.warnAtPercent && !isExceeded;
            const isPaused = !item.isEnabled;

            // Color scheme based on status
            let barGradient = "from-[#004fff] to-[#31afd4]";
            let glow = "rgba(0,79,255,0.3)";
            let badgeBg = "bg-[#004fff]/10 text-[#31afd4] border-[#004fff]/30";
            let badgeText = `${formatDuration(remainingSeconds)} left`;

            if (isPaused) {
              barGradient = "from-[#52525b] to-[#71717a]";
              glow = "transparent";
              badgeBg = "bg-white/[0.04] text-[#71717a] border-white/[0.08]";
              badgeText = "Paused";
            } else if (isExceeded) {
              barGradient = "from-[#ef4444] to-[#f43f5e]";
              glow = "rgba(239,68,68,0.4)";
              badgeBg = "bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/40";
              badgeText = `Over by ${formatDuration(overSeconds)}`;
            } else if (isWarn) {
              barGradient = "from-[#f59e0b] to-[#fbbf24]";
              glow = "rgba(245,158,11,0.35)";
              badgeBg = "bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/40";
              badgeText = `${formatDuration(remainingSeconds)} left`;
            }

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isExceeded
                    ? "bg-[#ef4444]/[0.04] border-[#ef4444]/25 shadow-[0_0_15px_rgba(239,68,68,0.08)]"
                    : isWarn
                    ? "bg-[#f59e0b]/[0.04] border-[#f59e0b]/25"
                    : "bg-[#17171a]/80 border-[#27272a] hover:border-white/[0.12]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AppIcon appName={item.appName} size="sm" />
                    <span className="text-xs font-semibold text-[#f4f4f5] truncate">
                      {item.appName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${badgeBg}`}
                    >
                      {isExceeded && <AlertTriangle size={11} />}
                      {badgeText}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="relative h-2 rounded-full bg-[#27272a] overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500`}
                      style={{
                        width: `${pct}%`,
                        boxShadow: `0 0 8px ${glow}`,
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-[#71717a]">
                    <span>
                      {formatDuration(usedSeconds)} <span className="text-[#52525b]">/</span> {item.limitMinutes}m limit
                    </span>
                    <span
                      className={
                        isExceeded ? "text-[#f87171] font-bold" : isWarn ? "text-[#fbbf24]" : "text-[#a1a1aa]"
                      }
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
