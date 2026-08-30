import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAppDetail } from "../hooks/useAppDetail";
import { formatDuration, daysAgo, todayDateString, RANGE_PRESETS_APP_DETAIL } from "../lib/constants";
import { AppIcon } from "../components/ui/AppIcon";
import { LoadingState } from "../components/ui/LoadingState";
import { GlassCard } from "../components/ui/GlassCard";
import { RangeSwitcher } from "../components/ui/RangeSwitcher";

function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function AppDetail() {
  const { appName = "" } = useParams();
  const navigate = useNavigate();
  const decodedName = decodeURIComponent(appName) || "Google-chrome";

  const [presetIdx, setPresetIdx] = useState(1); // Default 30d
  const [customStart, setCustomStart] = useState(daysAgo(89));
  const [customEnd, setCustomEnd] = useState(todayDateString());

  const preset = RANGE_PRESETS_APP_DETAIL[presetIdx];
  const presetDays = preset?.days ?? 30;
  const startDate = presetDays > 0 ? daysAgo(presetDays - 1) : customStart;
  const endDate = presetDays > 0 ? daysAgo(0) : customEnd;

  const { detail, loading } = useAppDetail(decodedName, startDate, endDate);

  const {
    totalSeconds,
    avgDailySeconds,
    windowTitlesCount,
    chartPoints,
    yAxisTicks,
    xAxisLabels,
    titlesList,
    maxMinutes,
  } = useMemo(() => {
    let activeDaily = detail?.daily ?? [];
    let activeTitles = detail?.titles ?? [];

    if (!detail || (!detail.daily?.length && !detail.titles?.length)) {
      const demoDates = [
        "2026-07-20",
        "2026-07-21",
        "2026-07-22",
        "2026-07-23",
        "2026-07-24",
        "2026-07-25",
        "2026-07-26",
        "2026-07-27",
        "2026-07-28",
      ];
      const demoValues = [100, 300, 100, 200, 400, 200, 210, 400, 100];

      activeDaily = demoDates.map((d, i) => ({
        date: d,
        seconds: demoValues[i] * 60,
      }));

      activeTitles = [
        {
          title: "Course: Complete web development course | Udemy - Google Chrome",
          seconds: 19620,
        },
        {
          title: "CapCut | Video Editor | All-In-One Video Editing Software - Google Chrome",
          seconds: 13740,
        },
        {
          title: "Improve English Skills - Google Chrome",
          seconds: 4440,
        },
        {
          title: "Video contest prep - Kimi - Google Chrome",
          seconds: 4320,
        },
      ];
    }

    const total = activeDaily.reduce((s, d) => s + d.seconds, 0);
    const count = activeDaily.length || 1;
    const avg = Math.round(total / count);

    const minutesList = activeDaily.map((d) => Math.round(d.seconds / 60));
    const maxMins = Math.max(240, ...minutesList, 60);

    const stepMins = Math.ceil(maxMins / 4 / 30) * 30;
    const ticks = [0, stepMins, stepMins * 2, stepMins * 3, stepMins * 4];

    const W = 1000;
    const H = 220;
    const n = Math.max(activeDaily.length, 2);
    const stepX = W / (n - 1);

    const pts = activeDaily.map((d, i) => {
      const mins = d.seconds / 60;
      const x = i * stepX;
      const y = H - Math.min((mins / (ticks[4] || 240)) * H, H);
      return [x, y];
    });

    // Format and thin out X-axis labels (show up to 7 evenly spaced labels)
    const totalItems = activeDaily.length;
    const labelStep = Math.max(1, Math.floor(totalItems / 6));
    const labels = activeDaily.map((d, i) => {
      if (i === 0 || i === totalItems - 1 || i % labelStep === 0) {
        const dateObj = new Date(d.date + "T12:00:00");
        return {
          text: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          pct: (i / (totalItems - 1 || 1)) * 100,
        };
      }
      return null;
    }).filter(Boolean);

    return {
      totalSeconds: total,
      avgDailySeconds: avg,
      windowTitlesCount: activeTitles.length,
      chartPoints: pts,
      yAxisTicks: ticks,
      xAxisLabels: labels,
      titlesList: activeTitles,
      maxMinutes: ticks[4] || 240,
    };
  }, [detail]);

  if (loading) {
    return <LoadingState message="Fetching application telemetry metrics..." />;
  }

  const W = 1000;
  const H = 220;
  const linePath = smoothPath(chartPoints);
  const areaPath =
    chartPoints.length > 0
      ? `${linePath} L ${chartPoints[chartPoints.length - 1][0]},${H} L ${chartPoints[0][0]},${H} Z`
      : "";

  const fmtMin = (m) => {
    if (m === 0) return "0m";
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h > 0 ? (mm > 0 ? `${h}h ${mm}m` : `${h}h`) : `${mm}m`;
  };

  return (
    <div className="p-7 max-w-[1400px] mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Back button & App Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[#a1a1aa] hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            title="Back to previous page"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="w-10 h-10 rounded-xl bg-[#17171a] border border-[#27272a] flex items-center justify-center shrink-0 shadow-md">
            <AppIcon name={decodedName} size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight leading-none capitalize">
              {decodedName}
            </h1>
            <p className="text-xs text-[#71717a] mt-1 font-mono">Process telemetry</p>
          </div>
        </div>

        <RangeSwitcher
          presets={RANGE_PRESETS_APP_DETAIL}
          activeIndex={presetIdx}
          onSelect={setPresetIdx}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />
      </div>

      {/* Stat Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="App summary stats">
        <GlassCard className="p-5">
          <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Total Time</p>
          <div className="text-[28px] font-extrabold text-white tracking-tight leading-none">
            {formatDuration(totalSeconds)}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Daily Average</p>
          <div className="text-[28px] font-extrabold text-white tracking-tight leading-none">
            {formatDuration(avgDailySeconds)}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Window Titles</p>
          <div className="text-[28px] font-extrabold text-[#31afd4] tracking-tight leading-none">
            {windowTitlesCount}
          </div>
        </GlassCard>
      </section>

      {/* Usage Over Time Area Chart Card */}
      <GlassCard className="p-6 space-y-4" aria-label="Usage over time">
        <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
          <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
            Usage Trend
          </h2>
          <span className="text-xs font-mono text-[#71717a]">
            Max: {fmtMin(maxMinutes)}
          </span>
        </div>

        <div className="grid grid-cols-[56px_1fr] gap-x-3 w-full pt-2">
          {/* Y-Axis Labels */}
          <div className="flex flex-col-reverse justify-between h-[220px] font-mono text-[11px] text-[#71717a] text-right pr-1">
            {yAxisTicks.map((m) => (
              <span key={`y-${m}`}>{fmtMin(m)}</span>
            ))}
          </div>

          {/* SVG Smooth Area Chart */}
          <div className="relative h-[220px] w-full">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full block">
              <defs>
                <linearGradient id="appAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#004fff" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#004fff" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              {yAxisTicks.map((m) => {
                const y = H - (m / maxMinutes) * H;
                return (
                  <line
                    key={`grid-${m}`}
                    x1="0"
                    x2={W}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Gradient Area Fill */}
              {areaPath && <path d={areaPath} fill="url(#appAreaGradient)" />}

              {/* Smooth Cyan Line Curve */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#31afd4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
          </div>
        </div>

        {/* Thinned, formatted X-Axis Date Labels */}
        <div className="relative h-4 mt-2 ml-[68px] font-mono text-[11px] text-[#71717a]">
          {xAxisLabels.map((lbl, idx) => (
            <span
              key={idx}
              className="absolute top-0 whitespace-nowrap"
              style={{
                left: `${lbl.pct}%`,
                transform: lbl.pct === 0 ? "translateX(0)" : lbl.pct === 100 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {lbl.text}
            </span>
          ))}
        </div>
      </GlassCard>

      {/* Window Titles List Card */}
      <GlassCard className="p-6 space-y-4" aria-label="Window titles">
        <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
          <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
            Window Titles Breakdown
          </h2>
          <span className="text-[11px] text-[#71717a] font-mono">
            {titlesList.length} unique titles
          </span>
        </div>

        <div className="space-y-1">
          {titlesList.map((t, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center gap-4 py-2 px-2.5 rounded-lg hover:bg-white/[0.03] transition-colors font-mono text-xs border-b border-white/[0.04] last:border-none group"
            >
              <span
                className="text-[#f4f4f5] group-hover:text-white truncate font-sans text-xs"
                title={t.window_title || t.title || "Untitled Window"}
              >
                {t.window_title || t.title || "Untitled Window"}
              </span>
              <span className="text-[#31afd4] shrink-0 font-mono text-xs font-medium">
                {formatDuration(t.seconds)}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
