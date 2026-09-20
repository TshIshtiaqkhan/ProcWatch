import { useTodayData } from "../hooks/useTodayData";
import { useAppLimits } from "../hooks/useAppLimits";
import { SummaryCard } from "../components/ui/SummaryCard";
import { AppBarChart } from "../components/charts/AppBarChart";
import { AppUsageList } from "../components/dashboard/AppUsageList";
import { AppLimitsCard } from "../components/dashboard/AppLimitsCard";
import { formatDuration } from "../lib/constants";
import { LoadingState } from "../components/ui/LoadingState";
import { GlassCard } from "../components/ui/GlassCard";

export function Today() {
  const {
    usage,
    totalActiveSeconds,
    idleSeconds,
    yesterdayActiveSeconds,
    yesterdayIdleSeconds,
    loading,
  } = useTodayData();

  const { limits, loading: limitsLoading } = useAppLimits();

  // Fallback demo usage if no database records exist yet
  const demoUsage = [
    { app_name: "Google Chrome", original_name: "Google Chrome", seconds: 11700 },
    { app_name: "Visual Studio Code", original_name: "Visual Studio Code", seconds: 20760 },
    { app_name: "Slack", original_name: "Slack", seconds: 16500 },
    { app_name: "Spotify", original_name: "Spotify", seconds: 12900 },
    { app_name: "Zoom", original_name: "Zoom", seconds: 13140 },
  ];

  const isSampleData = !usage || usage.length === 0;
  const activeData = !isSampleData ? usage : demoUsage;
  const activeSecondsTotal = !isSampleData ? totalActiveSeconds : 20160; // 5h 36m demo
  const idleSecondsTotal = !isSampleData ? idleSeconds : 3660; // 1h 1m demo

  const topApp = activeData[0] || { app_name: "Google Chrome", seconds: 11700 };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Calculate real percentage change vs yesterday with accessible directional symbols
  let activeSubtext = "▲ +12% vs yesterday";
  let activeSubtextType = "positive";
  if (yesterdayActiveSeconds > 0) {
    const diffPct = Math.round(
      ((activeSecondsTotal - yesterdayActiveSeconds) / yesterdayActiveSeconds) * 100
    );
    if (diffPct >= 0) {
      activeSubtext = `▲ +${diffPct}% vs yesterday`;
      activeSubtextType = "positive";
    } else {
      activeSubtext = `▼ ${diffPct}% vs yesterday`;
      activeSubtextType = "negative";
    }
  }

  let idleSubtext = "▼ -5% vs yesterday";
  let idleSubtextType = "positive";
  if (yesterdayIdleSeconds > 0) {
    const diffPct = Math.round(
      ((idleSecondsTotal - yesterdayIdleSeconds) / yesterdayIdleSeconds) * 100
    );
    if (diffPct >= 0) {
      idleSubtext = `▲ +${diffPct}% vs yesterday`;
      idleSubtextType = "negative";
    } else {
      idleSubtext = `▼ ${diffPct}% vs yesterday`;
      idleSubtextType = "positive";
    }
  }

  if (loading) {
    return <LoadingState message="Fetching today's session telemetry..." />;
  }

  return (
    <div className="p-7 max-w-[1400px] mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight leading-none">
              Today's Dashboard
            </h1>
            <span className="bg-[#004fff]/15 text-[#31afd4] border border-[#004fff]/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,79,255,0.25)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff007f] animate-pulse shadow-[0_0_6px_rgba(255,0,127,0.8)]" />
              Live
            </span>
            {isSampleData && (
              <span className="text-[11px] font-semibold text-[#31afd4] px-2.5 py-0.5 rounded-full bg-[#31afd4]/10 border border-[#31afd4]/25">
                Sample Insights
              </span>
            )}
          </div>
          <p className="text-xs text-[#a1a1aa] mt-2 font-normal font-mono">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title="Active Time"
          value={formatDuration(activeSecondsTotal)}
          subtext={activeSubtext}
          subtextType={activeSubtextType}
        />
        <SummaryCard
          title="Idle Time"
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

      {/* Daily App Usage Limits Card */}
      <AppLimitsCard limits={limits} loading={limitsLoading} />

      {/* Time per Application Horizontal Chart Card */}
      <GlassCard className="p-5 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
          <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
            Time per Application
          </h2>
        </div>
        <AppBarChart data={activeData} />
      </GlassCard>

      {/* Detailed Application Breakdown Card */}
      <GlassCard className="p-5 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
          <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
            Application Usage Breakdown
          </h2>
          <span className="text-[11px] text-[#71717a] font-mono">
            {activeData.length} apps tracked
          </span>
        </div>
        <AppUsageList data={activeData} />
      </GlassCard>
    </div>
  );
}
