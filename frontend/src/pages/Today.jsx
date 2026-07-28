import { useTodayData } from "../hooks/useTodayData";
import { SummaryCard } from "../components/ui/SummaryCard";
import { AppBarChart } from "../components/charts/AppBarChart";
import { AppUsageList } from "../components/dashboard/AppUsageList";
import { formatDuration } from "../lib/constants";
import { Clock, Coffee, Trophy, Sparkles, Activity } from "lucide-react";

export function Today() {
  const { usage, totalActiveSeconds, idleSeconds, loading } = useTodayData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl glass-panel text-indigo-300 font-medium">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span>Fetching today's session activity...</span>
        </div>
      </div>
    );
  }

  if (usage.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[500px] text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2 shadow-2xl">
          <Activity size={32} className="animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Tracking Initialized & Running
        </h2>
        <p className="text-slate-400 text-sm max-w-md leading-relaxed">
          ProcWatch background tracker is monitoring your active windows. Check back in a few minutes to see your initial usage graph.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fadeIn pb-16">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden p-6 rounded-2xl glass-panel border border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide mb-2">
              <Sparkles size={12} className="text-indigo-400 animate-pulse" />
              <span>Real-Time Screen Time</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Today's Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Live summary of active application usage, idle time detection, and per-app time breakdown.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Tracking
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Active Time Today"
          value={formatDuration(totalActiveSeconds)}
          icon={Clock}
          badge="Active"
        />

        <SummaryCard
          label="Idle Time Today"
          value={formatDuration(idleSeconds)}
          icon={Coffee}
          badge="Idle"
        />

        <SummaryCard
          label="Top Application"
          value={usage[0]?.app_name ?? "—"}
          sub={usage[0] ? formatDuration(usage[0].seconds) : undefined}
          icon={Trophy}
        />
      </div>

      {/* Bar Chart Section */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white tracking-wide">
          Time per Application
        </h2>
        <AppBarChart data={usage} />
      </div>

      {/* Detailed App List */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white tracking-wide">
          Application Usage Breakdown
        </h2>
        <AppUsageList data={usage} totalSeconds={totalActiveSeconds} />
      </div>
    </div>
  );
}
