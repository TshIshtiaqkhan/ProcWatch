import { useState, useEffect } from "react";
import { X, Play } from "lucide-react";
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
        className="w-full max-w-[580px] bg-[#141416]/95 border border-[#27272a] rounded-[18px] p-8 relative overflow-hidden text-[#f4f4f5] selection:bg-[#004fff]/30"
        style={{
          boxShadow: "0 25px 70px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.07)",
        }}
      >
        {/* Faint scanline texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "repeating-linear-gradient(to bottom, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)",
          }}
        />

        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-[#71717a] hover:text-[#f4f4f5] hover:bg-white/[0.06] transition-colors cursor-pointer z-20"
          title="Dismiss (Esc)"
        >
          <X size={18} />
        </button>

        {/* Header Title & Subhead */}
        <div className="mb-6 relative z-10">
          <h2 className="text-2xl font-bold text-white tracking-tight leading-snug">
            Session Snapshot
          </h2>
          <p className="text-xs text-[#a1a1aa] mt-1 font-medium">
            Paused at <span className="font-mono text-[#f4f4f5]">{data?.pausedAt || "—"}</span> · today,{" "}
            <span className="font-mono text-[#f4f4f5]">{data?.dateFormatted || "—"}</span>
          </p>
        </div>

        {/* Total Time Block */}
        <div className="flex items-baseline gap-3 pb-5 mb-5 border-b border-[#27272a] relative z-10">
          <span className="text-[40px] font-extrabold text-white tracking-tight leading-none font-mono">
            {data ? formatDuration(data.totalSeconds) : "0m"}
          </span>
          <span className="text-xs text-[#a1a1aa] font-medium uppercase tracking-wider">tracked</span>
          <span className="ml-auto text-right text-xs text-[#a1a1aa] leading-tight font-mono">
            across <span className="text-[#31afd4] font-bold text-sm">{data?.appCount || 0}</span> applications
          </span>
        </div>

        {/* Ranked Apps List with Segmented Meters */}
        <div className="space-y-4 my-3 max-h-[340px] overflow-y-auto pr-1 relative z-10">
          {loading ? (
            <div className="py-10 text-center text-xs text-[#71717a] font-mono">
              Loading snapshot...
            </div>
          ) : data?.apps && data.apps.length > 0 ? (
            data.apps.map((item, i) => {
              const filledCount = Math.max(1, Math.round(((item.percent || 0) / 100) * SEGMENTS));
              const isFirst = i === 0;

              return (
                <div key={item.app_name} className="grid grid-cols-[24px_1fr_auto] items-center gap-3.5">
                  {/* Rank */}
                  <span
                    className={`font-mono text-xs font-semibold ${
                      isFirst ? "text-[#31afd4]" : "text-[#71717a]"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* App Info & Segmented Meter */}
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AppIcon name={item.app_name} size={16} />
                      <span className="text-xs font-semibold text-[#f4f4f5] truncate">
                        {item.app_name}
                      </span>
                    </div>

                    {/* Segmented Meter Bar */}
                    <div className="h-2 flex gap-[2px] w-full">
                      {Array.from({ length: SEGMENTS }).map((_, s) => {
                        const isFilled = s < filledCount;
                        return (
                          <span
                            key={s}
                            className={`flex-1 rounded-[1px] transition-colors ${
                              isFilled
                                ? isFirst
                                  ? "bg-[#004fff] shadow-[0_0_6px_rgba(0,79,255,0.6)]"
                                  : "bg-[#31afd4] shadow-[0_0_5px_rgba(49,175,212,0.45)]"
                                : "bg-[#1f1f22]"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Duration & Percent */}
                  <div className="text-right whitespace-nowrap pl-2">
                    <div className="font-mono text-xs font-semibold text-[#f4f4f5]">
                      {formatDuration(item.seconds)}
                    </div>
                    <div className="font-mono text-[11px] text-[#71717a]">
                      {item.percent}%
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-[#71717a] font-mono">
              No active window activity recorded yet today.
            </div>
          )}
        </div>

        {/* Centered Resume Tracking Footer */}
        <div className="mt-6 pt-5 border-t border-[#27272a] flex justify-center items-center relative z-10">
          <button
            onClick={() => {
              onResume();
            }}
            className="flex items-center justify-center gap-2 px-7 py-2.5 bg-[#004fff] hover:bg-[#31afd4] text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-[0_0_25px_rgba(0,79,255,0.45)] hover:shadow-[0_0_30px_rgba(49,175,212,0.55)] cursor-pointer"
          >
            <Play size={14} fill="currentColor" />
            Resume Tracking
          </button>
        </div>
      </div>
    </div>
  );
}
