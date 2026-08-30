import { useState, useEffect } from "react";
import { X, Play, Activity } from "lucide-react";
import { formatDuration } from "../../lib/constants";
import { AppIcon } from "../ui/AppIcon";

const SEGMENTS = 24;

export function PauseSummaryModal({ isOpen, onClose, onResume }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoading(true);

    const fetchSummary = async () => {
      try {
        if (window.electronAPI?.getPauseSummary) {
          const res = await window.electronAPI.getPauseSummary();
          if (mounted && res?.success && res?.data) {
            setData(res.data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load pause summary:", err);
      }

      // Fallback if no backend data or empty
      if (mounted) {
        const now = new Date();
        setData({
          totalSeconds: 0,
          appCount: 0,
          pausedAt: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          dateFormatted: now.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          apps: [],
        });
        setLoading(false);
      }
    };

    fetchSummary();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      mounted = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-200 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[460px] bg-[#141416]/95 border border-[#27272a] rounded-[16px] p-7 relative overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.7)] text-[#f4f4f5] selection:bg-[#004fff]/30"
        style={{
          boxShadow: "0 20px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        {/* Faint scanline texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "repeating-linear-gradient(to bottom, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)",
          }}
        />

        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-[#71717a] hover:text-[#f4f4f5] hover:bg-white/[0.06] transition-colors cursor-pointer z-20"
          title="Dismiss (Esc)"
        >
          <X size={16} />
        </button>

        {/* Status Header */}
        <div className="flex items-center gap-2 mb-1.5 relative z-10">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#f59e0b] font-semibold">
            Tracking paused
          </span>
        </div>

        {/* Title & Subhead */}
        <h2 className="text-[21px] font-bold text-white tracking-tight leading-snug mt-1 mb-0.5 relative z-10">
          Session snapshot
        </h2>
        <p className="text-xs text-[#8b93a1] mb-5 relative z-10">
          Paused at <span className="font-mono text-[#f4f4f5]">{data?.pausedAt || "—"}</span> · today,{" "}
          <span className="font-mono text-[#f4f4f5]">{data?.dateFormatted || "—"}</span>
        </p>

        {/* Total Time Block */}
        <div className="flex items-baseline gap-2.5 pb-4 mb-4 border-b border-[#262b34] relative z-10">
          <span className="text-[34px] font-extrabold text-white tracking-tight leading-none font-mono">
            {data ? formatDuration(data.totalSeconds) : "0m"}
          </span>
          <span className="text-xs text-[#8b93a1] font-medium">tracked</span>
          <span className="ml-auto text-right text-xs text-[#8b93a1] leading-tight font-mono">
            across<br />
            <span className="text-[#31afd4] font-semibold">{data?.appCount || 0}</span> apps
          </span>
        </div>

        {/* Ranked Apps List with Segmented Meters */}
        <div className="space-y-3.5 my-2 max-h-[300px] overflow-y-auto pr-0.5 relative z-10">
          {loading ? (
            <div className="py-8 text-center text-xs text-[#71717a] font-mono">
              Loading snapshot...
            </div>
          ) : data?.apps && data.apps.length > 0 ? (
            data.apps.map((item, i) => {
              const filledCount = Math.max(1, Math.round(((item.percent || 0) / 100) * SEGMENTS));
              const isFirst = i === 0;

              return (
                <div key={item.app_name} className="grid grid-cols-[22px_1fr_auto] items-center gap-3">
                  {/* Rank */}
                  <span
                    className={`font-mono text-xs font-semibold ${
                      isFirst ? "text-[#f59e0b]" : "text-[#71717a]"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* App Info & Segmented Meter */}
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AppIcon name={item.app_name} size={14} />
                      <span className="text-xs font-medium text-[#e8eaed] truncate">
                        {item.app_name}
                      </span>
                    </div>

                    {/* Segmented Meter Bar */}
                    <div className="h-1.5 flex gap-[2px] w-full">
                      {Array.from({ length: SEGMENTS }).map((_, s) => {
                        const isFilled = s < filledCount;
                        return (
                          <span
                            key={s}
                            className={`flex-1 rounded-[1px] transition-colors ${
                              isFilled
                                ? isFirst
                                  ? "bg-[#f59e0b] shadow-[0_0_4px_rgba(245,158,11,0.5)]"
                                  : "bg-[#31afd4] shadow-[0_0_4px_rgba(49,175,212,0.4)]"
                                : "bg-[#2a2f38]"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Duration & Percent */}
                  <div className="text-right whitespace-nowrap pl-2">
                    <div className="font-mono text-xs font-medium text-[#f4f4f5]">
                      {formatDuration(item.seconds)}
                    </div>
                    <div className="font-mono text-[11px] text-[#8b93a1]">
                      {item.percent}%
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-xs text-[#71717a] font-mono">
              No active window activity recorded yet today.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-[#262b34] flex justify-between items-center relative z-10">
          <span className="font-mono text-[11px] text-[#71717a] uppercase tracking-wider">
            SQLITE · SESSIONS
          </span>

          <button
            onClick={() => {
              onResume();
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#004fff] hover:bg-[#31afd4] text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-[0_0_20px_rgba(0,79,255,0.4)] hover:shadow-[0_0_25px_rgba(49,175,212,0.5)] cursor-pointer"
          >
            <Play size={13} fill="currentColor" />
            Resume tracking
          </button>
        </div>
      </div>
    </div>
  );
}
