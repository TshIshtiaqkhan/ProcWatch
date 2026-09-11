import { useState, useEffect } from "react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function FocusHistoryChart({ data }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-xs text-[#71717a]">
        No focus sessions recorded yet. Start your first session above!
      </div>
    );
  }

  const maxSessions = Math.max(...data.map((d) => d.sessions), 1);
  const ceilMax = Math.max(4, Math.ceil(maxSessions * 1.2));

  return (
    <div className="w-full space-y-3">
      <div className="flex items-end gap-2 h-[160px] px-1">
        {data.map((day) => {
          const completedPct = (day.completedCount / ceilMax) * 100;
          const incompletePct = ((day.sessions - day.completedCount) / ceilMax) * 100;
          const dateObj = new Date(day.date + "T12:00:00");
          const dayLabel = DAY_NAMES[dateObj.getDay()];

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 group">
              <div className="w-full flex flex-col justify-end h-[130px] relative">
                {/* Incomplete sessions */}
                {incompletePct > 0 && (
                  <div
                    className="w-full rounded-t-[4px] bg-[#3f3f46] transition-all duration-700 ease-out"
                    style={{ height: mounted ? `${Math.max(incompletePct, 3)}%` : "0%" }}
                  />
                )}
                {/* Completed sessions */}
                <div
                  className={`w-full ${incompletePct > 0 ? "" : "rounded-t-[4px]"} rounded-b-[4px] bg-gradient-to-t from-[#004fff] to-[#31afd4] shadow-[0_0_8px_rgba(0,79,255,0.3)] transition-all duration-700 ease-out`}
                  style={{ height: mounted ? `${Math.max(completedPct, day.completedCount > 0 ? 3 : 0)}%` : "0%" }}
                />

                {/* Tooltip on hover */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#1f1f22] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-[10px] text-[#f4f4f5] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  <div>{day.completedCount}/{day.sessions} completed</div>
                  <div className="text-[#71717a]">{day.totalMinutes}m focused</div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-[#71717a]">{dayLabel}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 pt-1 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-[#004fff] to-[#31afd4]" />
          <span className="text-[11px] text-[#71717a] font-mono">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#3f3f46]" />
          <span className="text-[11px] text-[#71717a] font-mono">Cancelled</span>
        </div>
      </div>
    </div>
  );
}
