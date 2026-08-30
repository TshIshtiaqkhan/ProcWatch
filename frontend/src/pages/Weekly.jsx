import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useRangeData } from "../hooks/useRangeData";
import { formatDuration, daysAgo } from "../lib/constants";
import { AppIcon } from "../components/ui/AppIcon";
import { LoadingState } from "../components/ui/LoadingState";
import { GlassCard } from "../components/ui/GlassCard";
import { SpotlightCard } from "../components/ui/SpotlightCard";

// 6-Color Charting Palette (from design.md)
const SERIES_PALETTE = [
  "#94a3b8", // 0: other / slate
  "#3b82f6", // 1: electric blue
  "#22d3ee", // 2: cyan
  "#f472b6", // 3: soft pink
  "#4ade80", // 4: mint
  "#a78bfa", // 5: violet
];

export function Weekly() {
  const navigate = useNavigate();
  const startDate = daysAgo(6);
  const endDate = daysAgo(0);
  const { usage, loading } = useRangeData(startDate, endDate);

  const {
    totalSeconds,
    avgDailySeconds,
    topApp,
    legendSeries,
    dayColumns,
    maxHours,
    yTicks,
    sortedApps,
    isSampleData,
  } = useMemo(() => {
    let activeUsage = usage;
    let sample = false;

    if (!usage || usage.length === 0) {
      sample = true;
      const demoAppsList = [
        { name: "google-chrome", weight: 0.35 },
        { name: "code", weight: 0.25 },
        { name: "obsidian", weight: 0.18 },
        { name: "whatsapp", weight: 0.12 },
        { name: "firefox-esr", weight: 0.06 },
        { name: "gnome-terminal", weight: 0.04 },
      ];

      const demoDayMultipliers = [0.95, 0.92, 0.85, 0.90, 0.82, 0.40, 0.45];

      activeUsage = [];
      for (let i = 6; i >= 0; i--) {
        const dateStr = daysAgo(i);
        const dayIdx = 6 - i;
        const dayTotalSecs = Math.round(36000 * demoDayMultipliers[dayIdx]);

        demoAppsList.forEach((app) => {
          activeUsage.push({
            date: dateStr,
            app_name: app.name,
            seconds: Math.round(dayTotalSecs * app.weight),
          });
        });
      }
    }

    const dayMap = new Map();
    const appTotalsMap = new Map();
    let total = 0;

    for (const row of activeUsage) {
      if (!dayMap.has(row.date)) dayMap.set(row.date, new Map());
      const dayApps = dayMap.get(row.date);
      dayApps.set(row.app_name, (dayApps.get(row.app_name) ?? 0) + row.seconds);

      appTotalsMap.set(row.app_name, (appTotalsMap.get(row.app_name) ?? 0) + row.seconds);
      total += row.seconds;
    }

    const sorted = [...appTotalsMap.entries()]
      .map(([name, seconds]) => ({ name, seconds }))
      .sort((a, b) => b.seconds - a.seconds);

    const top5 = sorted.slice(0, 5);
    const top5Names = top5.map((a) => a.name);

    // Build series legend
    const legend = top5.map((app, idx) => ({
      name: app.name,
      color: SERIES_PALETTE[idx + 1] || SERIES_PALETTE[1],
    }));

    if (sorted.length > 5) {
      legend.push({ name: "other", color: SERIES_PALETTE[0] });
    }

    // Determine max day seconds to compute Y-axis max hours dynamically
    let maxDaySecs = 0;
    const daysData = [];

    for (let i = 6; i >= 0; i--) {
      const dateStr = daysAgo(i);
      const dayDate = new Date(dateStr + "T12:00:00");
      const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short" });

      const dayAppsMap = dayMap.get(dateStr) ?? new Map();
      let daySum = 0;

      const segs = [];

      // Calculate other
      let otherSecs = 0;
      for (const [appName, secs] of dayAppsMap.entries()) {
        daySum += secs;
        if (!top5Names.includes(appName)) {
          otherSecs += secs;
        }
      }

      if (otherSecs > 0) {
        segs.push({ name: "other", seconds: otherSecs, color: SERIES_PALETTE[0] });
      }

      // Add top 5 apps in reverse (top 1 at top of stack)
      for (let idx = top5.length - 1; idx >= 0; idx--) {
        const appName = top5[idx].name;
        const secs = dayAppsMap.get(appName) ?? 0;
        if (secs > 0) {
          segs.push({ name: appName, seconds: secs, color: SERIES_PALETTE[idx + 1] || SERIES_PALETTE[1] });
        }
      }

      if (daySum > maxDaySecs) maxDaySecs = daySum;

      daysData.push({
        day: dayLabel,
        dateStr,
        totalSecs: daySum,
        segments: segs,
      });
    }

    const rawHours = maxDaySecs / 3600;
    const computedMaxHours = Math.max(6, Math.ceil(rawHours / 2) * 2);

    const ticks = [];
    const step = computedMaxHours <= 6 ? 1 : 2;
    for (let h = 0; h <= computedMaxHours; h += step) {
      ticks.push(h);
    }

    const activeDaysCount = daysData.filter((d) => d.totalSecs > 0).length;
    const avg = Math.round(total / Math.max(activeDaysCount, 1));
    const top = sorted[0] || { name: "—", seconds: 0 };

    return {
      totalSeconds: total,
      avgDailySeconds: avg,
      topApp: top,
      legendSeries: legend,
      dayColumns: daysData,
      maxHours: computedMaxHours,
      yTicks: ticks,
      sortedApps: sorted,
      isSampleData: sample,
    };
  }, [usage]);

  if (loading) {
    return <LoadingState message="Analyzing weekly usage distribution..." />;
  }

  const leftApps = sortedApps.slice(0, Math.ceil(sortedApps.length / 2));
  const rightApps = sortedApps.slice(Math.ceil(sortedApps.length / 2));

  return (
    <div className="p-7 max-w-[1400px] mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight leading-none">
            Weekly Overview
          </h1>
          <p className="text-xs text-[#a1a1aa] mt-2 font-normal">
            Last 7 days usage aggregate &amp; application breakdown
          </p>
        </div>
        {isSampleData && (
          <span className="text-[11px] font-semibold text-[#31afd4] px-3 py-1 rounded-full bg-[#31afd4]/10 border border-[#31afd4]/25">
            Sample Insights
          </span>
        )}
      </header>

      {/* Summary Stat Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Summary stats">
        <SpotlightCard>
          <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Total Active Time</p>
          <div className="text-[30px] font-extrabold text-white tracking-tight leading-none">
            {formatDuration(totalSeconds)}
          </div>
          <p className="text-xs text-[#71717a] mt-2 font-mono">7 Days aggregated</p>
        </SpotlightCard>

        <SpotlightCard>
          <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Daily Average</p>
          <div className="text-[30px] font-extrabold text-white tracking-tight leading-none">
            {formatDuration(avgDailySeconds)}
          </div>
          <p className="text-xs text-[#71717a] mt-2 font-mono">Per active day</p>
        </SpotlightCard>

        <SpotlightCard>
          <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Top Application</p>
          <div className="text-[30px] font-extrabold text-white tracking-tight leading-none truncate">
            {topApp.name}
          </div>
          <p className="text-xs text-[#31afd4] mt-2 font-mono">{formatDuration(topApp.seconds)}</p>
        </SpotlightCard>
      </section>

      {/* Daily Distribution Stacked Bar Chart Card */}
      <GlassCard className="p-6 space-y-4" aria-label="Daily distribution">
        <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
          <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
            Daily Distribution
          </h2>
          <span className="text-xs font-mono text-[#71717a]">
            Max: {maxHours}h
          </span>
        </div>

        {/* Stacked Chart Container */}
        <div className="grid grid-cols-[36px_1fr] gap-x-3 w-full pt-2">
          {/* Y-Axis Labels */}
          <div className="flex flex-col-reverse justify-between h-[220px] font-mono text-[11px] text-[#71717a] text-right">
            {yTicks.map((h) => (
              <span key={`y-${h}`}>{h}h</span>
            ))}
          </div>

          {/* Chart Plot Area */}
          <div>
            <div className="relative h-[220px] grid grid-cols-7 items-end gap-5 border-b border-white/[0.08]">
              {/* Horizontal Gridlines */}
              <div className="absolute inset-0 flex flex-col-reverse justify-between pointer-events-none">
                {yTicks.map((h) => (
                  <span key={`grid-${h}`} className="border-t border-white/[0.04] h-0 block" />
                ))}
              </div>

              {/* Day Bar Columns */}
              {dayColumns.map((col) => (
                <div key={col.dateStr} className="relative flex justify-center h-full items-end z-10 group">
                  <div className="w-9 h-full max-w-full flex flex-col-reverse justify-start rounded-t-md overflow-hidden bg-white/[0.02]">
                    {col.segments.map((seg) => {
                      const rawPx = Math.round((seg.seconds / (maxHours * 3600)) * 220);
                      const pxHeight = seg.seconds > 0 ? Math.max(rawPx, 4) : 0;

                      return (
                        <div
                          key={`${col.dateStr}-${seg.name}`}
                          className="w-full shrink-0 transition-all duration-300 hover:brightness-125"
                          style={{
                            height: `${pxHeight}px`,
                            backgroundColor: seg.color,
                          }}
                          title={`${seg.name}: ${formatDuration(seg.seconds)}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* X-Axis Labels */}
            <div className="grid grid-cols-7 gap-5 mt-2.5">
              {dayColumns.map((col) => (
                <span key={`x-${col.dateStr}`} className="text-center text-xs font-medium text-[#a1a1aa]">
                  {col.day}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Series Legend */}
        {legendSeries.length > 0 && (
          <div className="flex flex-wrap gap-4 pt-2 border-t border-white/[0.04] text-xs text-[#a1a1aa]">
            {legendSeries.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-2">
                <i className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: s.color }} />
                <span className="truncate max-w-[120px]">{s.name}</span>
              </span>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Weekly Breakdown Card — Rows are clickable to navigate to /app/:appName */}
      <GlassCard className="p-6 space-y-4" aria-label="Weekly breakdown">
        <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
          <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
            Weekly Breakdown
          </h2>
          <span className="text-[11px] text-[#71717a] font-mono">
            Click app to view detail
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          <div className="space-y-1">
            {leftApps.map((app) => (
              <div
                key={app.name}
                onClick={() => navigate(`/app/${encodeURIComponent(app.name)}`)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all cursor-pointer group"
              >
                <AppIcon name={app.name} size={18} />
                <span className="flex-1 text-xs font-semibold text-[#f4f4f5] group-hover:text-white truncate">
                  {app.name}
                </span>
                <span className="font-mono text-xs text-[#a1a1aa] group-hover:text-[#31afd4] transition-colors">
                  {formatDuration(app.seconds)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {rightApps.map((app) => (
              <div
                key={app.name}
                onClick={() => navigate(`/app/${encodeURIComponent(app.name)}`)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all cursor-pointer group"
              >
                <AppIcon name={app.name} size={18} />
                <span className="flex-1 text-xs font-semibold text-[#f4f4f5] group-hover:text-white truncate">
                  {app.name}
                </span>
                <span className="font-mono text-xs text-[#a1a1aa] group-hover:text-[#31afd4] transition-colors">
                  {formatDuration(app.seconds)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
