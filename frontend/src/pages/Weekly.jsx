import { useMemo } from "react";
import { useRangeData } from "../hooks/useRangeData";
import { formatDuration, daysAgo } from "../lib/constants";
import { AppIcon } from "../components/ui/AppIcon";
import { LoadingState } from "../components/ui/LoadingState";
import { GlassCard } from "../components/ui/GlassCard";

const SERIES_PALETTE = [
  "#848592", // series 0: other (gray)
  "#b175fb", // series 1: google-chrome (purple)
  "#358de5", // series 2: code (blue)
  "#36be6e", // series 3: obsidian (green)
  "#f28c04", // series 4: firefox-esr (orange)
  "#e64d8c", // series 5: whatsapp (pink)
];

export function Weekly() {
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
      // Demo dataset matching weekly.html specifications
      const demoAppsList = [
        { name: "google-chrome", weight: 0.35 },
        { name: "code", weight: 0.25 },
        { name: "obsidian", weight: 0.18 },
        { name: "whatsapp", weight: 0.12 },
        { name: "firefox-esr", weight: 0.06 },
        { name: "gnome-terminal", weight: 0.04 },
      ];

      const demoDayMultipliers = [0.95, 0.92, 0.85, 0.90, 0.82, 0.40, 0.45]; // Mon to Sun

      activeUsage = [];
      for (let i = 6; i >= 0; i--) {
        const dateStr = daysAgo(i);
        const dayIdx = 6 - i;
        const dayTotalSecs = Math.round(36000 * demoDayMultipliers[dayIdx]); // ~10h max

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
      color: SERIES_PALETTE[idx + 1],
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

      // Segments order bottom to top: [other, top5... top1]
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

      // Add top 5 apps in reverse (so top 1 is at top of stack)
      for (let idx = top5.length - 1; idx >= 0; idx--) {
        const appName = top5[idx].name;
        const secs = dayAppsMap.get(appName) ?? 0;
        if (secs > 0) {
          segs.push({ name: appName, seconds: secs, color: SERIES_PALETTE[idx + 1] });
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

    // Calculate Y-Axis Max Hours (minimum 6h baseline, rounding up to nearest even hour)
    const rawHours = maxDaySecs / 3600;
    const computedMaxHours = Math.max(6, Math.ceil(rawHours / 2) * 2);

    // Dynamic ticks (e.g. 0h, 2h, 4h, 6h, 8h, 10h, 12h)
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
    <div className="p-[28px_34px] max-w-[1400px] mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Header matching weekly.html .page-header */}
      <header className="flex items-center justify-between mb-[24px]">
        <h1 className="text-[28px] font-bold text-[#f4f4f5] tracking-tight leading-[34px] m-0">
          Weekly Overview
        </h1>
        {isSampleData && (
          <span className="text-[12px] font-medium text-purple-300 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
            Sample Insights
          </span>
        )}
      </header>

      {/* Summary Stat Grid matching weekly.html .stat-grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-[16px] mb-[24px]" aria-label="Summary stats">
        <GlassCard className="p-[18px_20px]">
          <p className="text-[14px] text-[#a1a1aa] m-0 mb-[10px]">Total Active Time</p>
          <div className="text-[30px] font-bold text-[#f4f4f5] leading-[38px] tracking-[-0.01em]">
            {formatDuration(totalSeconds)}
          </div>
          <p className="text-[14px] text-[#a1a1aa] mt-[6px] m-0">7 Days</p>
        </GlassCard>

        <GlassCard className="p-[18px_20px]">
          <p className="text-[14px] text-[#a1a1aa] m-0 mb-[10px]">Daily Average</p>
          <div className="text-[30px] font-bold text-[#f4f4f5] leading-[38px] tracking-[-0.01em]">
            {formatDuration(avgDailySeconds)}
          </div>
          <p className="text-[14px] text-[#a1a1aa] mt-[6px] m-0">Per Active Day</p>
        </GlassCard>

        <GlassCard className="p-[18px_20px]">
          <p className="text-[14px] text-[#a1a1aa] m-0 mb-[10px]">Top App</p>
          <div className="text-[30px] font-bold text-[#f4f4f5] leading-[38px] tracking-[-0.01em] truncate">
            {topApp.name}
          </div>
          <p className="text-[14px] text-[#a1a1aa] mt-[6px] m-0">{formatDuration(topApp.seconds)}</p>
        </GlassCard>
      </section>

      {/* Daily Distribution Stacked Bar Chart Card matching weekly.html .chart-wrap */}
      <GlassCard
        className="p-[22px_24px] mb-[24px]"
        aria-label="Daily distribution"
      >
        <h2 className="text-[16px] font-semibold text-[#f4f4f5] leading-[24px] m-0 mb-[22px]">
          Daily Distribution
        </h2>

        {/* Stacked Chart Container */}
        <div className="grid grid-cols-[36px_1fr] gap-x-[12px] w-full">
          {/* Y-Axis Labels */}
          <div className="flex flex-col-reverse justify-between h-[220px] font-mono text-[12px] text-[#a1a1aa] text-right">
            {yTicks.map((h) => (
              <span key={`y-${h}`}>{h}h</span>
            ))}
          </div>

          {/* Chart Plot Area */}
          <div>
            <div className="relative h-[220px] grid grid-cols-7 items-end gap-[20px] border-b border-white/[0.09]">
              {/* Horizontal Gridlines */}
              <div className="absolute inset-0 flex flex-col-reverse justify-between pointer-events-none">
                {yTicks.map((h) => (
                  <span key={`grid-${h}`} className="border-t border-white/[0.09] h-0 block" />
                ))}
              </div>

              {/* Day Bar Columns */}
              {dayColumns.map((col) => (
                <div key={col.dateStr} className="relative flex justify-center h-full items-end z-10">
                  <div className="w-[46px] h-full max-w-full flex flex-col-reverse justify-start rounded-t-[4px] overflow-hidden">
                    {col.segments.map((seg) => {
                      // 220px total plot area height
                      const rawPx = Math.round((seg.seconds / (maxHours * 3600)) * 220);
                      const pxHeight = seg.seconds > 0 ? Math.max(rawPx, 4) : 0;

                      return (
                        <div
                          key={`${col.dateStr}-${seg.name}`}
                          className="w-full shrink-0 transition-all duration-300"
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
            <div className="grid grid-cols-7 gap-[20px] mt-[10px]">
              {dayColumns.map((col) => (
                <span key={`x-${col.dateStr}`} className="text-center text-[14px] text-[#a1a1aa]">
                  {col.day}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Series Legend matching weekly.html .chart-legend */}
        {legendSeries.length > 0 && (
          <div className="flex flex-wrap gap-[18px] mt-[18px] pl-[48px] text-[13px] text-[#a1a1aa]">
            {legendSeries.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-[7px]">
                <i className="w-[10px] h-[10px] rounded-[3px] inline-block" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Weekly Breakdown Card matching weekly.html .breakdown-grid */}
      <GlassCard
        className="p-[22px_24px]"
        aria-label="Weekly breakdown"
      >
        <h2 className="text-[16px] font-semibold text-[#f4f4f5] leading-[24px] m-0 mb-[22px]">
          Weekly Breakdown
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[40px] gap-y-2">
          {/* Left Column Apps */}
          <div className="space-y-1">
            {leftApps.map((app) => (
              <div
                key={app.name}
                className="flex items-center gap-[12px] min-h-[46px] px-[4px] rounded-[8px] hover:bg-white/[0.035] transition-colors cursor-pointer"
              >
                <AppIcon name={app.name} />
                <span className="flex-1 text-[15px] font-medium text-[#f4f4f5] truncate">
                  {app.name}
                </span>
                <span className="font-mono text-[14px] text-[#a1a1aa]">
                  {formatDuration(app.seconds)}
                </span>
              </div>
            ))}
          </div>

          {/* Right Column Apps */}
          <div className="space-y-1">
            {rightApps.map((app) => (
              <div
                key={app.name}
                className="flex items-center gap-[12px] min-h-[46px] px-[4px] rounded-[8px] hover:bg-white/[0.035] transition-colors cursor-pointer"
              >
                <AppIcon name={app.name} />
                <span className="flex-1 text-[15px] font-medium text-[#f4f4f5] truncate">
                  {app.name}
                </span>
                <span className="font-mono text-[14px] text-[#a1a1aa]">
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
