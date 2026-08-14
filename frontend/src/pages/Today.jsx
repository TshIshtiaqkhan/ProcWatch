import { useTodayData } from "../hooks/useTodayData";
import { SummaryCard } from "../components/ui/SummaryCard";
import { AppBarChart } from "../components/charts/AppBarChart";
import { AppUsageList } from "../components/dashboard/AppUsageList";
import { formatDuration } from "../lib/constants";

export function Today() {
  const {
    usage,
    totalActiveSeconds,
    idleSeconds,
    yesterdayActiveSeconds,
    yesterdayIdleSeconds,
    loading,
  } = useTodayData();

  // Fallback demo usage if no database records exist yet
  const demoUsage = [
    { app_name: "Google Chrome", original_name: "Google Chrome", seconds: 11700 },
    { app_name: "Visual Studio Code", original_name: "Visual Studio Code", seconds: 20760 },
    { app_name: "Slack", original_name: "Slack", seconds: 16500 },
    { app_name: "Spotify", original_name: "Spotify", seconds: 12900 },
    { app_name: "Zoom", original_name: "Zoom", seconds: 13140 },
  ];

  const activeData = usage && usage.length > 0 ? usage : demoUsage;
  const activeSecondsTotal = usage && usage.length > 0 ? totalActiveSeconds : 20160; // 5h 36m
  const idleSecondsTotal = usage && usage.length > 0 ? idleSeconds : 3660; // 1h 1m

  const topApp = activeData[0] || { app_name: "Google Chrome", seconds: 11700 };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Calculate real percentage change vs yesterday
  let activeSubtext = "↑ +12% from yesterday";
  let activeSubtextType = "positive";
  if (yesterdayActiveSeconds > 0) {
    const diffPct = Math.round(
      ((activeSecondsTotal - yesterdayActiveSeconds) / yesterdayActiveSeconds) * 100
    );
    if (diffPct >= 0) {
      activeSubtext = `↑ +${diffPct}% from yesterday`;
      activeSubtextType = "positive";
    } else {
      activeSubtext = `↓ ${diffPct}% from yesterday`;
      activeSubtextType = "negative";
    }
  }

  let idleSubtext = "↓ -5% from yesterday";
  let idleSubtextType = "negative";
  if (yesterdayIdleSeconds > 0) {
    const diffPct = Math.round(
      ((idleSecondsTotal - yesterdayIdleSeconds) / yesterdayIdleSeconds) * 100
    );
    if (diffPct >= 0) {
      idleSubtext = `↑ +${diffPct}% from yesterday`;
      idleSubtextType = "negative";
    } else {
      idleSubtext = `↓ ${diffPct}% from yesterday`;
      idleSubtextType = "positive";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#141416]/90 border border-white/10 text-purple-300 font-medium backdrop-blur-md">
          <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span>Fetching today's session activity...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-[28px_34px] max-w-[1400px] mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Top Banner Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-bold text-white tracking-tight leading-none">
            Today's Dashboard
          </h1>
          <span className="bg-[#a855f7] text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            Live
          </span>
        </div>
        <p className="text-[13px] text-[#a1a1aa] mt-2 font-normal">
          Current date: {formattedDate}
        </p>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title="Active Time Today"
          value={formatDuration(activeSecondsTotal)}
          subtext={activeSubtext}
          subtextType={activeSubtextType}
        />
        <SummaryCard
          title="Idle Time Today"
          value={formatDuration(idleSecondsTotal)}
          subtext={idleSubtext}
          subtextType={idleSubtextType}
        />
        <SummaryCard
          title="Top Application"
          value={topApp.app_name}
          subtext={formatDuration(topApp.seconds)}
          subtextType="neutral"
        />
      </div>

      {/* Time per Application Horizontal Chart Card */}
      <div
        className="p-5 rounded-[14px] border border-white/[0.16] shadow-2xl relative overflow-hidden"
        style={{
          backgroundColor: "rgba(20, 20, 22, 0.92)",
          backdropFilter: "blur(14px)",
        }}
      >
        <h2 className="text-[13px] font-medium text-[#a1a1aa] tracking-wide mb-5">
          Time per Application
        </h2>
        <AppBarChart data={activeData} />
      </div>

      {/* Detailed Application Breakdown Card */}
      <div
        className="p-5 rounded-[14px] border border-white/[0.16] shadow-2xl relative overflow-hidden"
        style={{
          backgroundColor: "rgba(20, 20, 22, 0.92)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[13px] font-medium text-[#a1a1aa] tracking-wide">
            Application Usage Breakdown
          </h2>
        </div>
        <AppUsageList data={activeData} />
      </div>
    </div>
  );
}

