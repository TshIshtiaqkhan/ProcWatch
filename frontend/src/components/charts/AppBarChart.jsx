import { useState, useEffect } from "react";
import { formatDuration } from "../../lib/constants";

export function AppBarChart({ data }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) return null;

  const topApps = data.slice(0, 6);
  const maxRawHours = Math.max(...topApps.map((r) => r.seconds / 3600), 1);
  // Round up to nearest even hour ceiling (minimum 4h)
  const maxHours = Math.max(4, Math.ceil(maxRawHours * 1.15 / 2) * 2);

  const ticks = [
    { pct: 0, label: "0" },
    { pct: 25, label: `${(maxHours * 0.25).toFixed(maxHours % 4 === 0 ? 0 : 1)}h` },
    { pct: 50, label: `${(maxHours * 0.5).toFixed(0)}h` },
    { pct: 75, label: `${(maxHours * 0.75).toFixed(maxHours % 4 === 0 ? 0 : 1)}h` },
    { pct: 100, label: `${maxHours}h` },
  ];

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3.5">
        {topApps.map((row) => {
          const hours = row.seconds / 3600;
          const pct = Math.min((hours / maxHours) * 100, 100);

          return (
            <div
              key={row.app_name}
              className="grid items-center gap-3"
              style={{ gridTemplateColumns: "130px 1fr" }}
            >
              <div className="text-xs font-medium text-[#a1a1aa] text-right truncate" title={row.app_name}>
                {row.app_name}
              </div>
              <div className="relative h-5 w-full bg-white/[0.03] rounded-md overflow-hidden border border-white/[0.04]">
                <div
                  className="h-full rounded-md bg-gradient-to-r from-[#004fff] to-[#31afd4] shadow-[0_0_12px_rgba(0,79,255,0.35)] transition-all duration-700 ease-out"
                  style={{ width: mounted ? `${Math.max(pct, 2)}%` : "0%" }}
                  title={`${row.app_name}: ${formatDuration(row.seconds)}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic X-Axis Scale Grid */}
      <div className="grid gap-3 pt-1 border-t border-white/[0.06]" style={{ gridTemplateColumns: "130px 1fr" }}>
        <div />
        <div className="relative h-4 font-mono text-[11px] text-[#71717a]">
          {ticks.map((t, idx) => (
            <span
              key={idx}
              className="absolute top-0"
              style={{
                left: `${t.pct}%`,
                transform: t.pct === 0 ? "translateX(0)" : t.pct === 100 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
