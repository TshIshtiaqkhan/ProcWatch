import { useState } from "react";
import { AlertTriangle, Clock, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { AppIcon } from "../ui/AppIcon";
import { GlassCard } from "../ui/GlassCard";

const PRESET_MINUTES = [15, 30, 45, 60, 120];

export function AppLimitsSettings({ limits = [], onUpsert, onRemove, onToggle, categories = [] }) {
  const [appName, setAppName] = useState("");
  const [limitMinutes, setLimitMinutes] = useState(45);
  const [warnPercent, setWarnPercent] = useState(80);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAdd = async (e) => {
    e?.preventDefault?.();
    if (!appName.trim()) {
      setErrorMsg("Please enter an application name");
      return;
    }
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      const success = await onUpsert(appName.trim(), Number(limitMinutes), Number(warnPercent), true);
      if (success) {
        setAppName("");
        setLimitMinutes(45);
        setWarnPercent(80);
      } else {
        setErrorMsg("Failed to save limit. Check inputs and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extract unique app names from categories as suggestions
  const suggestedApps = categories
    .map((c) => c.app_name)
    .filter((name) => !limits.some((l) => l.appName.toLowerCase() === name.toLowerCase()))
    .slice(0, 5);

  return (
    <GlassCard className="p-6 space-y-5" aria-label="Daily App Usage Limits">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Clock size={16} className="text-[#31afd4]" />
          <div>
            <h2 className="text-sm font-semibold text-[#f4f4f5] tracking-wide">
              Daily App Usage Limits & Budgets
            </h2>
            <p className="text-[11px] text-[#71717a] mt-0.5">
              Set maximum daily usage thresholds. You'll receive native desktop notifications at 80% and 100% capacity.
            </p>
          </div>
        </div>
      </div>

      {/* Add New Limit Form */}
      <form onSubmit={handleAdd} className="bg-[#17171a] border border-[#27272a] rounded-xl p-4 space-y-4">
        <div className="text-xs font-semibold text-[#f4f4f5]">Configure New Daily Limit</div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-xs text-[#f87171]">
            <AlertTriangle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider">
              Application Name
            </label>
            <input
              type="text"
              placeholder="e.g. Discord, Steam, google-chrome"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs bg-[#111113] text-white border border-[#27272a] focus:border-[#004fff] focus:outline-none transition-colors"
            />
            {suggestedApps.length > 0 && !appName && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-[#71717a]">Suggestions:</span>
                {suggestedApps.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAppName(s)}
                    className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-[#a1a1aa] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer border border-white/[0.06]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider">
              Daily Limit (Minutes)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="1440"
                value={limitMinutes}
                onChange={(e) => setLimitMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-24 px-3 py-2 rounded-lg text-xs font-mono bg-[#111113] text-white border border-[#27272a] focus:border-[#004fff] focus:outline-none"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {PRESET_MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLimitMinutes(m)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                      limitMinutes === m
                        ? "bg-[#004fff] text-white border-[#004fff]/80 shadow-[0_0_10px_rgba(0,79,255,0.3)]"
                        : "bg-white/[0.04] text-[#a1a1aa] border-white/[0.08] hover:text-white hover:bg-white/[0.08]"
                    }`}
                  >
                    {m < 60 ? `${m}m` : `${m / 60}h`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#71717a]">Early alert threshold:</span>
            <select
              value={warnPercent}
              onChange={(e) => setWarnPercent(Number(e.target.value))}
              className="px-2 py-1 rounded bg-[#111113] text-white border border-[#27272a] text-xs font-mono focus:outline-none"
            >
              <option value="50">50%</option>
              <option value="70">70%</option>
              <option value="80">80% (Recommended)</option>
              <option value="90">90%</option>
              <option value="100">100% (No early alert)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !appName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#004fff] hover:bg-[#31afd4] shadow-[0_0_15px_rgba(0,79,255,0.35)] transition-all cursor-pointer border border-[#004fff]/60 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            <span>Set Limit</span>
          </button>
        </div>
      </form>

      {/* Configured Limits List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-semibold text-[#a1a1aa]">
          <span>Configured Limits ({limits.length})</span>
          <span className="text-[11px] text-[#71717a] font-mono">Auto-resets at midnight</span>
        </div>

        {limits.length === 0 ? (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center text-xs text-[#71717a]">
            No limits configured yet. Add your first app above!
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06] rounded-xl border border-[#27272a] bg-[#17171a] overflow-hidden">
            {limits.map((item) => (
              <div
                key={item.id}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AppIcon appName={item.appName} size="sm" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-[#f4f4f5] block truncate">
                      {item.appName}
                    </span>
                    <span className="text-[11px] text-[#71717a] font-mono block">
                      Limit: {item.limitMinutes}m/day • Warns at {item.warnAtPercent}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.isEnabled}
                    onClick={() => onToggle(item.appName, !item.isEnabled)}
                    className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer border-none ${
                      item.isEnabled
                        ? "bg-[#004fff] shadow-[0_0_8px_rgba(0,79,255,0.4)]"
                        : "bg-[#3f3f46]"
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        item.isEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemove(item.appName)}
                    className="p-1.5 rounded-lg text-[#71717a] hover:text-[#f87171] hover:bg-[#ef4444]/10 transition-colors cursor-pointer"
                    title="Delete Limit"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
