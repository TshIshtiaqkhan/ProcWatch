import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRangeData } from "../hooks/useRangeData";
import { formatDuration, daysAgo, todayDateString, RANGE_PRESETS_MONTHLY } from "../lib/constants";
import { AppIcon } from "../components/ui/AppIcon";
import { LoadingState } from "../components/ui/LoadingState";
import { GlassCard } from "../components/ui/GlassCard";
import { RangeSwitcher } from "../components/ui/RangeSwitcher";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Monthly() {
  const navigate = useNavigate();
  const [presetIdx, setPresetIdx] = useState(0); // Default to 7 Days
  const [customStart, setCustomStart] = useState(daysAgo(89));
  const [customEnd, setCustomEnd] = useState(todayDateString());

  const presetDays = RANGE_PRESETS_MONTHLY[presetIdx]?.days ?? 7;
  const startDate = presetDays > 0 ? daysAgo(presetDays - 1) : customStart;
  const endDate = presetDays > 0 ? daysAgo(0) : customEnd;

  const { usage, loading } = useRangeData(startDate, endDate);

  // Generate heatmap & metrics dynamically based on user selection
  const { totalSeconds, avgDailySeconds, activeDaysCount, dayCount, peakDay, heatmapWeeks, appLeaderboard } =
    useMemo(() => {
      const dayMap = new Map();
      const appMap = new Map();
      let total = 0;

      if (usage && usage.length > 0) {
        for (const row of usage) {
          const prev = dayMap.get(row.date) ?? 0;
          dayMap.set(row.date, prev + row.seconds);

          const appPrev = appMap.get(row.app_name) ?? 0;
          appMap.set(row.app_name, appPrev + row.seconds);

          total += row.seconds;
        }
      } else {
        // Fallback mock data matching user selection length
        const demoApps = [
          { name: "Visual Studio Code", weight: 0.4 },
          { name: "Google Chrome", weight: 0.3 },
          { name: "Slack", weight: 0.15 },
          { name: "Spotify", weight: 0.1 },
          { name: "Zoom", weight: 0.05 },
        ];

        let seed = 42;
        const rand = () => {
          seed = (seed * 9301 + 49297) % 233280;
          return seed / 233280;
        };

        const targetDays = presetDays > 0 ? presetDays : 30;
        for (let i = targetDays - 1; i >= 0; i--) {
          const dateStr = daysAgo(i);
          const dayIndex = new Date(dateStr + "T12:00:00").getDay();
          const weekendLull = dayIndex === 0 || dayIndex === 6 ? 0.35 : 1;
          const r = rand() * weekendLull;
          let secs = 0;
          if (r >= 0.38 && r < 0.58) secs = 3600;
          else if (r >= 0.58 && r < 0.75) secs = 9000;
          else if (r >= 0.75 && r < 0.9) secs = 18000;
          else if (r >= 0.9) secs = 23400;

          dayMap.set(dateStr, secs);
          total += secs;

          demoApps.forEach((app) => {
            const appSecs = Math.round(secs * app.weight);
            const appPrev = appMap.get(app.name) ?? 0;
            appMap.set(app.name, appPrev + appSecs);
          });
        }
      }

      let max = 0;
      let peak = { date: "—", seconds: 0 };

      for (const [d, secs] of dayMap.entries()) {
        if (secs > max) {
          max = secs;
          peak = {
            date: new Date(d + "T12:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            seconds: secs,
          };
        }
      }

      // Build date range array for heatmap
      const start = new Date(startDate + "T12:00:00");
      const end = new Date(endDate + "T12:00:00");
      const dayCells = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
        const secs = dayMap.get(ds) ?? 0;

        let level = 0;
        if (secs > 0) {
          if (secs < 5400) level = 1;
          else if (secs < 14400) level = 2;
          else if (secs < 25200) level = 3;
          else level = 4;
        }

        dayCells.push({
          date: ds,
          seconds: secs,
          level,
          dayOfWeek: d.getDay(),
          monthName: d.toLocaleDateString("en-US", { month: "short" }),
          label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        });
      }

      // Group dayCells into weekly columns for the heatmap matrix
      const weeks = [];
      let currentWeek = [];
      let currentMonthHeader = dayCells[0]?.monthName ?? "";

      const startOffset = dayCells[0]?.dayOfWeek ?? 0;
      for (let i = 0; i < startOffset; i++) {
        currentWeek.push({ isPlaceholder: true });
      }

      dayCells.forEach((cell) => {
        currentWeek.push(cell);
        if (currentWeek.length === 7) {
          weeks.push({
            monthHeader: cell.monthName,
            days: currentWeek,
          });
          currentWeek = [];
        }
      });

      if (currentWeek.length > 0) {
        weeks.push({
          monthHeader: currentWeek.find((d) => !d.isPlaceholder)?.monthName ?? currentMonthHeader,
          days: currentWeek,
        });
      }

      // Leaderboard
      const leaderboard = [...appMap.entries()]
        .map(([name, seconds]) => ({ name, seconds }))
        .sort((a, b) => b.seconds - a.seconds);

      const activeDays = [...dayMap.values()].filter((s) => s > 0).length;
      const count = dayCells.length || (presetDays > 0 ? presetDays : 30);
      const avg = Math.round(total / Math.max(count, 1));

      return {
        totalSeconds: total,
        avgDailySeconds: avg,
        activeDaysCount: activeDays,
        dayCount: count,
        peakDay: peak,
        heatmapWeeks: weeks,
        appLeaderboard: leaderboard,
      };
    }, [usage, startDate, endDate, presetDays]);

  const activeRatePct = Math.round((activeDaysCount / Math.max(dayCount, 1)) * 100);

  if (loading) {
    return <LoadingState message="Generating activity heatmap telemetry..." />;
  }

  return (
    <div className="p-7 max-w-[1400px] mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight leading-none">
            Monthly &amp; Range View
          </h1>
          <p className="text-xs text-[#a1a1aa] mt-2 font-normal">
            Long-term habits, activity density heatmaps, and custom date range metrics
          </p>
        </div>

        <RangeSwitcher
          presets={RANGE_PRESETS_MONTHLY}
          activeIndex={presetIdx}
          onSelect={setPresetIdx}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />
      </header>

      {/* Card 1: Stat Grid */}
      <GlassCard className="!p-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
          <div className="p-5">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-[#a1a1aa] mb-2">
              Total Active Time
            </p>
            <div className="text-2xl font-extrabold text-white tracking-tight leading-none">
              {formatDuration(totalSeconds)}
            </div>
            <p className="text-xs text-[#71717a] mt-2 font-mono">{dayCount} Days</p>
          </div>

          <div className="p-5">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-[#a1a1aa] mb-2">
              Daily Average
            </p>
            <div className="text-2xl font-extrabold text-white tracking-tight leading-none">
              {formatDuration(avgDailySeconds)}
            </div>
            <p className="text-xs text-[#71717a] mt-2 font-mono">Active day mean</p>
          </div>

          <div className="p-5">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-[#a1a1aa] mb-2">
              Active Days
            </p>
            <div className="text-2xl font-extrabold text-white tracking-tight leading-none">
              {activeDaysCount} / {dayCount}
            </div>
            <p className="text-xs text-[#31afd4] mt-2 font-mono">{activeRatePct}% active rate</p>
          </div>

          <div className="p-5">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-[#a1a1aa] mb-2">
              Peak Day
            </p>
            <div className="text-2xl font-extrabold text-white tracking-tight leading-none">
              {peakDay.seconds > 0 ? formatDuration(peakDay.seconds) : "—"}
            </div>
            <p className="text-xs text-[#71717a] mt-2 font-mono">{peakDay.date}</p>
          </div>
        </div>
      </GlassCard>

      {/* Card 2: Activity Heatmap Grid */}
      <GlassCard className="p-6 space-y-4" aria-label="Activity heatmap">
        <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
          <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
            Activity Intensity Heatmap
          </h2>
          <span className="text-xs font-mono text-[#71717a]">
            {dayCount} day window
          </span>
        </div>

        <div className="overflow-x-auto py-2">
          <div
            className="inline-grid gap-x-3 gap-y-2"
            style={{
              gridTemplateColumns: `44px repeat(${heatmapWeeks.length}, 13px)`,
              gridTemplateRows: "auto auto",
            }}
          >
            {/* Corner Spacer */}
            <div style={{ gridRow: 1, gridColumn: 1 }} />

            {/* Month Header Row */}
            {heatmapWeeks.map((w, idx) => (
              <div
                key={`hdr-${idx}`}
                className="text-[10px] font-mono font-semibold text-[#71717a] pb-1 whitespace-nowrap"
                style={{ gridRow: 1, gridColumn: idx + 2 }}
              >
                {idx === 0 || heatmapWeeks[idx - 1]?.monthHeader !== w.monthHeader ? w.monthHeader : ""}
              </div>
            ))}

            {/* Day Labels Column */}
            <div
              className="grid gap-y-1 align-start"
              style={{ gridRow: 2, gridColumn: 1, gridTemplateRows: "repeat(7, 13px)" }}
            >
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-[10px] font-mono leading-[13px] text-[#71717a] flex items-center">
                  {d}
                </div>
              ))}
            </div>

            {/* Weekly Columns */}
            {heatmapWeeks.map((week, wIdx) => (
              <div
                key={`week-${wIdx}`}
                className="grid gap-1 align-start"
                style={{
                  gridRow: 2,
                  gridColumn: wIdx + 2,
                  gridTemplateRows: "repeat(7, 13px)",
                }}
              >
                {week.days.map((cell, dIdx) => {
                  if (cell.isPlaceholder) {
                    return <div key={`empty-${wIdx}-${dIdx}`} className="w-[13px] h-[13px] rounded-sm bg-transparent" />;
                  }

                  const heatStyles = [
                    "bg-[#17171a] border border-white/[0.04]",
                    "bg-[rgba(0,79,255,0.28)] border border-[rgba(0,79,255,0.3)]",
                    "bg-[rgba(0,79,255,0.55)] border border-[rgba(0,79,255,0.6)]",
                    "bg-[rgba(49,175,212,0.75)] border border-[#31afd4]",
                    "bg-[#31afd4] shadow-[0_0_8px_rgba(49,175,212,0.65)] border border-white/50",
                  ][cell.level];

                  return (
                    <div
                      key={cell.date}
                      className={`w-[13px] h-[13px] rounded-sm transition-all duration-150 hover:scale-125 cursor-pointer group relative ${heatStyles}`}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                        <div className="px-2.5 py-1 rounded-md bg-[#141416] border border-[#27272a] text-[11px] text-white shadow-2xl whitespace-nowrap font-mono">
                          <span className="font-semibold text-[#31afd4]">{cell.label}:</span>{" "}
                          {cell.seconds > 0 ? formatDuration(cell.seconds) : "No activity"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04] text-xs text-[#a1a1aa]">
          <span className="text-[11px] text-[#71717a]">Less</span>
          <span className="inline-block w-3 h-3 rounded-sm bg-[#17171a] border border-white/[0.04]" />
          <span className="inline-block w-3 h-3 rounded-sm bg-[rgba(0,79,255,0.28)]" />
          <span className="inline-block w-3 h-3 rounded-sm bg-[rgba(0,79,255,0.55)]" />
          <span className="inline-block w-3 h-3 rounded-sm bg-[rgba(49,175,212,0.75)]" />
          <span className="inline-block w-3 h-3 rounded-sm bg-[#31afd4] shadow-[0_0_6px_rgba(49,175,212,0.6)]" />
          <span className="text-[11px] text-[#71717a]">More</span>
        </div>
      </GlassCard>

      {/* Card 3: Application Usage Breakdown — Rows navigate to /app/:appName */}
      {appLeaderboard.length > 0 && (
        <GlassCard className="p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
            <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
              Application Usage Breakdown
            </h2>
            <span className="text-[11px] text-[#71717a] font-mono">
              Click app to inspect
            </span>
          </div>

          <div className="space-y-1.5">
            {appLeaderboard.slice(0, 8).map((app) => {
              const pct = totalSeconds > 0 ? Math.round((app.seconds / totalSeconds) * 100) : 0;

              return (
                <div
                  key={app.name}
                  onClick={() => navigate(`/app/${encodeURIComponent(app.name)}`)}
                  className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] flex items-center justify-between gap-4 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <AppIcon name={app.name} size={18} />
                    <span className="text-xs font-semibold text-[#f4f4f5] group-hover:text-white truncate">
                      {app.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-24 sm:w-36 bg-[#050505] rounded-full h-1.5 overflow-hidden border border-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#004fff] to-[#31afd4] shadow-[0_0_8px_rgba(0,79,255,0.4)] transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-[#a1a1aa] w-16 text-right">
                      {formatDuration(app.seconds)}
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#31afd4] w-10 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
