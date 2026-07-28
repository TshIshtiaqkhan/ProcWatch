import { useMemo, useState } from "react";
import { useRangeData } from "../hooks/useRangeData";
import { SummaryCard } from "../components/ui/SummaryCard";
import { formatDuration, daysAgo, todayDateString, CHART_COLORS } from "../lib/constants";
import {
  CalendarDays,
  Clock,
  TrendingUp,
  Flame,
  Sparkles,
  Calendar as CalendarIcon,
  Filter,
  BarChart3,
} from "lucide-react";

const RANGE_PRESETS = [
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
  { label: "Custom Range", days: 0 },
];

export function Monthly() {
  const [presetIdx, setPresetIdx] = useState(1);
  const [customStart, setCustomStart] = useState(daysAgo(89));
  const [customEnd, setCustomEnd] = useState(todayDateString());

  const presetDays = RANGE_PRESETS[presetIdx]?.days ?? 30;
  const startDate = presetDays > 0 ? daysAgo(presetDays - 1) : customStart;
  const endDate = presetDays > 0 ? daysAgo(0) : customEnd;

  const { usage, loading } = useRangeData(startDate, endDate);

  const { heatmapData, maxSeconds, totalSeconds, dayCount, peakDay, appLeaderboard } =
    useMemo(() => {
      const dayMap = new Map();
      const appMap = new Map();
      let total = 0;

      for (const row of usage) {
        const prev = dayMap.get(row.date) ?? 0;
        dayMap.set(row.date, prev + row.seconds);

        const appPrev = appMap.get(row.app_name) ?? 0;
        appMap.set(row.app_name, appPrev + row.seconds);

        total += row.seconds;
      }

      let max = 0;
      let peak = { date: "—", seconds: 0 };

      for (const [d, secs] of dayMap.entries()) {
        if (secs > max) {
          max = secs;
          peak = { date: d, seconds: secs };
        }
      }

      const start = new Date(startDate + "T12:00:00");
      const end = new Date(endDate + "T12:00:00");
      const days = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const secs = dayMap.get(ds) ?? 0;
        days.push({
          date: ds,
          seconds: secs,
          dayOfWeek: d.getDay(),
          label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
        });
      }

      // App leaderboard
      const leaderboard = [...appMap.entries()]
        .map(([name, seconds]) => ({ name, seconds }))
        .sort((a, b) => b.seconds - a.seconds);

      return {
        heatmapData: days,
        maxSeconds: max,
        totalSeconds: total,
        dayCount: days.length,
        peakDay: peak,
        appLeaderboard: leaderboard,
      };
    }, [usage, startDate, endDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl glass-panel text-indigo-300 font-medium">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span>Generating activity heatmap...</span>
        </div>
      </div>
    );
  }

  const activeDaysCount = heatmapData.filter((d) => d.seconds > 0).length;
  const avgDailySeconds = Math.round(totalSeconds / Math.max(dayCount, 1));

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fadeIn pb-16">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden p-6 rounded-2xl glass-panel border border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide mb-2">
              <Sparkles size={12} className="text-indigo-400 animate-pulse" />
              <span>Historical Trend Analytics</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Monthly & Custom View
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Visualize long-term screen habits, analyze activity heatmaps, and inspect usage intensity over custom date ranges.
            </p>
          </div>
        </div>
      </div>

      {/* Date Range Selector Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-slate-950/90 p-1 rounded-xl border border-slate-800 w-full sm:w-auto shadow-inner overflow-x-auto">
          {RANGE_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPresetIdx(i)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                i === presetIdx
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {presetIdx === 3 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-indigo-300 text-xs rounded-xl px-3.5 py-2 outline-none focus:border-indigo-500 shadow-inner"
            />
            <span className="text-xs text-slate-500 font-medium">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-indigo-300 text-xs rounded-xl px-3.5 py-2 outline-none focus:border-indigo-500 shadow-inner"
            />
          </div>
        )}
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Active Time"
          value={formatDuration(totalSeconds)}
          icon={Clock}
          badge={`${dayCount} Days`}
        />

        <SummaryCard
          label="Daily Average"
          value={formatDuration(avgDailySeconds)}
          icon={TrendingUp}
          sub="Across entire range"
        />

        <SummaryCard
          label="Active Days"
          value={`${activeDaysCount} / ${dayCount}`}
          sub={`${Math.round((activeDaysCount / Math.max(dayCount, 1)) * 100)}% active rate`}
          icon={CalendarDays}
        />

        <SummaryCard
          label="Peak Day"
          value={peakDay.seconds > 0 ? formatDuration(peakDay.seconds) : "—"}
          sub={
            peakDay.seconds > 0
              ? new Date(peakDay.date + "T12:00:00").toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                })
              : "No activity"
          }
          icon={Flame}
        />
      </div>

      {/* Heatmap Section */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Activity Heatmap Grid
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Daily active time intensity matrix. Hover over cells for exact durations.
            </p>
          </div>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-2">
          {heatmapData.length > 0 &&
            Array.from({ length: heatmapData[0].dayOfWeek }, (_, i) => (
              <div key={`offset-${i}`} className="aspect-square rounded-xl bg-transparent" />
            ))}

          {heatmapData.map((day) => {
            const intensity = maxSeconds > 0 ? day.seconds / maxSeconds : 0;
            const level =
              day.seconds === 0
                ? 0
                : intensity < 0.25
                ? 1
                : intensity < 0.5
                ? 2
                : intensity < 0.75
                ? 3
                : 4;

            const bgClasses = [
              "bg-slate-900/60 border border-slate-800/60 text-slate-600",
              "bg-indigo-950/60 border border-indigo-900/40 text-indigo-300",
              "bg-indigo-800/60 border border-indigo-700/50 text-indigo-200",
              "bg-indigo-600/80 border border-indigo-500/60 text-white font-semibold",
              "bg-indigo-500 border border-indigo-300/80 text-slate-950 font-bold shadow-[0_0_12px_rgba(99,102,241,0.5)]",
            ][level];

            return (
              <div
                key={day.date}
                className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-center text-xs transition-all duration-200 cursor-pointer hover:scale-110 hover:z-10 group relative ${bgClasses}`}
              >
                <span className="font-mono text-xs">
                  {new Date(day.date + "T12:00:00").getDate()}
                </span>

                {/* Custom Hover Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                  <div className="px-3 py-1.5 rounded-xl glass-panel border border-slate-700 text-xs font-medium text-white shadow-2xl whitespace-nowrap">
                    <span className="font-bold text-indigo-300">{day.label}:</span>{" "}
                    {formatDuration(day.seconds)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Heatmap Intensity Legend */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs text-slate-400 font-medium">
          <span>Less Active</span>
          <div className="flex items-center gap-2">
            {[
              "bg-slate-900/60 border border-slate-800/60",
              "bg-indigo-950/60 border border-indigo-900/40",
              "bg-indigo-800/60 border border-indigo-700/50",
              "bg-indigo-600/80 border border-indigo-500/60",
              "bg-indigo-500 border border-indigo-300/80 shadow-[0_0_8px_rgba(99,102,241,0.5)]",
            ].map((cls, i) => (
              <div key={i} className={`w-4 h-4 rounded-md ${cls}`} />
            ))}
          </div>
          <span>More Active</span>
        </div>
      </div>

      {/* Leaderboard Card */}
      {appLeaderboard.length > 0 && (
        <div className="rounded-2xl glass-panel p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
            <BarChart3 size={18} className="text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              Top Apps in Range
            </h2>
          </div>

          <div className="space-y-3">
            {appLeaderboard.slice(0, 8).map((app, index) => {
              const pct = totalSeconds > 0 ? Math.round((app.seconds / totalSeconds) * 100) : 0;
              const barColor = CHART_COLORS[index % CHART_COLORS.length];

              return (
                <div
                  key={app.name}
                  className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between gap-4 hover:border-slate-700/80 transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: barColor }}
                    />
                    <span className="text-sm font-semibold text-slate-200 truncate">
                      {app.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-24 sm:w-36 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <span className="text-xs font-mono font-semibold text-slate-300 w-16 text-right">
                      {formatDuration(app.seconds)}
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-500 w-10 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
