import { useState, useMemo } from "react";
import { useRangeData } from "../hooks/useRangeData";
import { useCategories } from "../hooks/useCategories";
import { StackedBarChart } from "../components/charts/StackedBarChart";
import { SummaryCard } from "../components/ui/SummaryCard";
import { formatDuration, daysAgo, CHART_COLORS } from "../lib/constants";
import {
  Calendar,
  Clock,
  Layers,
  BarChart2,
  TrendingUp,
  Sparkles,
  Award,
} from "lucide-react";

export function Weekly() {
  const [groupBy, setGroupBy] = useState("app");
  const startDate = daysAgo(6);
  const endDate = daysAgo(0);
  const { usage, loading } = useRangeData(startDate, endDate);
  const { categories } = useCategories();

  const { chartData, keys, totalSeconds, daysTracked, topGroup, groupTotals } = useMemo(() => {
    const dayMap = new Map();
    const totals = new Map();

    for (const row of usage) {
      const groupKey =
        groupBy === "category"
          ? (categories.find((c) => c.app_name === row.app_name)?.category ??
            "Uncategorized")
          : row.app_name;

      if (!dayMap.has(row.date)) dayMap.set(row.date, new Map());
      const appMap = dayMap.get(row.date);
      appMap.set(groupKey, (appMap.get(groupKey) ?? 0) + row.seconds);

      totals.set(groupKey, (totals.get(groupKey) ?? 0) + row.seconds);
    }

    const allKeys = new Set();
    let total = 0;

    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = daysAgo(i);
      const appMap = dayMap.get(d) ?? new Map();
      const entry = {
        day: new Date(d + "T12:00:00").toLocaleDateString("en", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      };
      for (const [key, secs] of appMap) {
        entry[key] = secs;
        allKeys.add(key);
        total += secs;
      }
      data.push(entry);
    }

    // Determine top group
    let maxGroup = { name: "—", seconds: 0 };
    for (const [name, secs] of totals) {
      if (secs > maxGroup.seconds) {
        maxGroup = { name, seconds: secs };
      }
    }

    // Sorted group totals for breakdown list
    const sortedGroupTotals = [...totals.entries()]
      .map(([name, secs]) => ({ name, seconds: secs }))
      .sort((a, b) => b.seconds - a.seconds);

    return {
      chartData: data,
      keys: [...allKeys],
      totalSeconds: total,
      daysTracked: new Set(usage.map((r) => r.date)).size,
      topGroup: maxGroup,
      groupTotals: sortedGroupTotals,
    };
  }, [usage, groupBy, categories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl glass-panel text-indigo-300 font-medium">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span>Analyzing weekly usage trends...</span>
        </div>
      </div>
    );
  }

  const dailyAvgSeconds = Math.round(totalSeconds / Math.max(daysTracked, 1));

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fadeIn pb-16">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden p-6 rounded-2xl glass-panel border border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold tracking-wide mb-2">
              <Sparkles size={12} className="text-purple-400 animate-pulse" />
              <span>7-Day Activity Insights</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Weekly Overview
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Track daily screen distribution, compare usage by application or category, and spot weekly focus patterns.
            </p>
          </div>

          {/* GroupBy Switcher */}
          <div className="flex items-center p-1 bg-slate-950/90 rounded-xl border border-slate-800 shadow-inner shrink-0">
            <button
              onClick={() => setGroupBy("app")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                groupBy === "app"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart2 size={14} />
              By App
            </button>
            <button
              onClick={() => setGroupBy("category")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                groupBy === "category"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers size={14} />
              By Category
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Active Time"
          value={formatDuration(totalSeconds)}
          icon={Clock}
          badge="7 Days"
        />

        <SummaryCard
          label="Daily Average"
          value={formatDuration(dailyAvgSeconds)}
          icon={TrendingUp}
          badge="Per Active Day"
        />

        <SummaryCard
          label="Active Days"
          value={String(daysTracked)}
          sub="Out of last 7 calendar days"
          icon={Calendar}
        />

        <SummaryCard
          label={`Top ${groupBy === "category" ? "Category" : "App"}`}
          value={topGroup.name}
          sub={topGroup.seconds > 0 ? formatDuration(topGroup.seconds) : "No data recorded"}
          icon={Award}
        />
      </div>

      {/* Stacked Bar Chart Card */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800/80">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Daily Distribution ({groupBy === "category" ? "By Category" : "By App"})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Stacked active seconds for each day of the current week.
            </p>
          </div>
        </div>

        {keys.length > 0 ? (
          <StackedBarChart data={chartData} apps={keys} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
              <BarChart2 size={24} />
            </div>
            <span className="text-sm font-semibold text-slate-300">No activity recorded for this week</span>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              ProcWatch automatically accumulates usage data when windows are active.
            </p>
          </div>
        )}
      </div>

      {/* Breakdown List */}
      {groupTotals.length > 0 && (
        <div className="rounded-2xl glass-panel p-6 border border-slate-800 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white tracking-wide">
            Weekly Breakdown ({groupBy === "category" ? "Categories" : "Applications"})
          </h2>
          <div className="space-y-3">
            {groupTotals.map((item, index) => {
              const pct = totalSeconds > 0 ? Math.round((item.seconds / totalSeconds) * 100) : 0;
              const barColor = CHART_COLORS[index % CHART_COLORS.length];

              return (
                <div
                  key={item.name}
                  className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between gap-4 hover:border-slate-700/80 transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: barColor }}
                    />
                    <span className="text-sm font-semibold text-slate-200 truncate">
                      {item.name}
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
                      {formatDuration(item.seconds)}
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
