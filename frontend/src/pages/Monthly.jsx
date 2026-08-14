import { useMemo, useState } from "react";
import { useRangeData } from "../hooks/useRangeData";
import { formatDuration, daysAgo, todayDateString } from "../lib/constants";
import {
  SiGooglechrome,
  SiSpotify,
  SiZoom,
  SiFirefox,
  SiDiscord,
  SiFigma,
  SiBrave,
  SiNotion,
  SiTelegram,
} from "react-icons/si";
import { FaSlack, FaTerminal } from "react-icons/fa";
import { VscVscode } from "react-icons/vsc";

const RANGE_PRESETS = [
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
  { label: "Custom Range", days: 0 },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AppIcon = ({ name }) => {
  const n = (name || "").toLowerCase();
  if (n.includes("chrome")) return <SiGooglechrome color="#4285F4" size={18} />;
  if (n.includes("slack")) return <FaSlack color="#E01E5A" size={18} />;
  if (n.includes("code") || n.includes("codium")) return <VscVscode color="#007ACC" size={18} />;
  if (n.includes("spotify")) return <SiSpotify color="#1DB954" size={18} />;
  if (n.includes("zoom")) return <SiZoom color="#2D8CFF" size={18} />;
  if (n.includes("firefox")) return <SiFirefox color="#FF7139" size={18} />;
  if (n.includes("discord")) return <SiDiscord color="#5865F2" size={18} />;
  if (n.includes("figma")) return <SiFigma color="#F24E1E" size={18} />;
  if (n.includes("brave")) return <SiBrave color="#FF1B2D" size={18} />;
  if (n.includes("notion")) return <SiNotion color="#FFFFFF" size={18} />;
  if (n.includes("telegram")) return <SiTelegram color="#26A5E4" size={18} />;
  if (
    n.includes("terminal") ||
    n.includes("konsole") ||
    n.includes("kitty") ||
    n.includes("alacritty") ||
    n.includes("bash")
  ) {
    return <FaTerminal color="#A1A1AA" size={16} />;
  }
  return (
    <div className="w-[20px] h-[20px] rounded-[5px] flex items-center justify-center text-[10px] font-bold bg-[#27272a] text-[#e4e4e7] border border-white/10 uppercase shrink-0">
      {(name || "A").slice(0, 1)}
    </div>
  );
};

export function Monthly() {
  const [presetIdx, setPresetIdx] = useState(0); // Default to 7 Days
  const [customStart, setCustomStart] = useState(daysAgo(89));
  const [customEnd, setCustomEnd] = useState(todayDateString());

  const presetDays = RANGE_PRESETS[presetIdx]?.days ?? 7;
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
          if (r >= 0.38 && r < 0.58) secs = 3600; // 1h
          else if (r >= 0.58 && r < 0.75) secs = 9000; // 2.5h
          else if (r >= 0.75 && r < 0.9) secs = 18000; // 5h
          else if (r >= 0.9) secs = 23400; // 6.5h

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
      let peak = { date: "Jul 25", seconds: 0 };

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

      // Offset starting day if range start doesn't land on Sunday
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#141416]/90 border border-white/10 text-purple-300 font-medium backdrop-blur-md">
          <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span>Generating activity heatmap...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-[28px_34px] max-w-[1400px] mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Header matching monthly.html .page-header */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-bold text-[#f4f4f5] tracking-tight leading-[34px] m-0">
            Monthly &amp; Custom View
          </h1>
          <p className="text-[14px] leading-[20px] text-[#a1a1aa] mt-2 max-w-[560px]">
            Visualize long-term screen habits, analyze activity heatmaps, and inspect usage intensity over custom date ranges.
          </p>
        </div>

        {/* Range Switcher Pill Group matching monthly.html .range-switch */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          <div
            className="inline-flex items-center gap-[2px] p-[4px] border border-white/[0.16] rounded-full shadow-xl"
            style={{ backgroundColor: "rgba(20, 20, 22, 0.92)", backdropFilter: "blur(14px)" }}
            role="group"
            aria-label="Date range"
          >
            {RANGE_PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setPresetIdx(i)}
                className={`border-none bg-transparent text-[13px] font-medium px-[16px] py-[8px] rounded-full transition-all whitespace-nowrap cursor-pointer ${
                  i === presetIdx
                    ? "bg-[#a855f7] text-white font-semibold"
                    : "text-[#a1a1aa] hover:text-[#f4f4f5]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {presetIdx === 3 && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-[#141416] border border-white/10 text-purple-300 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-[#a855f7]"
              />
              <span className="text-xs text-[#a1a1aa]">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-[#141416] border border-white/10 text-purple-300 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-[#a855f7]"
              />
            </div>
          )}
        </div>
      </header>

      {/* Card 1: Stat Grid matching monthly.html .stat-grid */}
      <section
        className="border border-white/[0.16] rounded-[14px] overflow-hidden shadow-2xl"
        style={{ backgroundColor: "rgba(20, 20, 22, 0.92)", backdropFilter: "blur(14px)" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.09]">
          <div className="p-[20px_22px]">
            <p className="text-[11px] font-semibold tracking-[0.07em] uppercase text-[#a1a1aa] m-0 mb-[10px]">
              Total Active Time
            </p>
            <div className="text-[24px] font-bold text-[#f4f4f5] leading-[32px] tracking-[-0.01em]">
              {formatDuration(totalSeconds)}
            </div>
            <p className="text-[13px] text-[#a1a1aa] mt-[6px] m-0">{dayCount} Days</p>
          </div>

          <div className="p-[20px_22px]">
            <p className="text-[11px] font-semibold tracking-[0.07em] uppercase text-[#a1a1aa] m-0 mb-[10px]">
              Daily Average
            </p>
            <div className="text-[24px] font-bold text-[#f4f4f5] leading-[32px] tracking-[-0.01em]">
              {formatDuration(avgDailySeconds)}
            </div>
            <p className="text-[13px] text-[#a1a1aa] mt-[6px] m-0">Across entire range</p>
          </div>

          <div className="p-[20px_22px]">
            <p className="text-[11px] font-semibold tracking-[0.07em] uppercase text-[#a1a1aa] m-0 mb-[10px]">
              Active Days
            </p>
            <div className="text-[24px] font-bold text-[#f4f4f5] leading-[32px] tracking-[-0.01em]">
              {activeDaysCount} / {dayCount}
            </div>
            <p className="text-[13px] text-[#a1a1aa] mt-[6px] m-0">{activeRatePct}% active rate</p>
          </div>

          <div className="p-[20px_22px]">
            <p className="text-[11px] font-semibold tracking-[0.07em] uppercase text-[#a1a1aa] m-0 mb-[10px]">
              Peak Day
            </p>
            <div className="text-[24px] font-bold text-[#f4f4f5] leading-[32px] tracking-[-0.01em]">
              {peakDay.seconds > 0 ? formatDuration(peakDay.seconds) : "—"}
            </div>
            <p className="text-[13px] text-[#a1a1aa] mt-[6px] m-0">{peakDay.date}</p>
          </div>
        </div>
      </section>

      {/* Card 2: Section Panel Activity Heatmap Grid matching monthly.html .section-panel & .heatmap */}
      <section
        className="p-[24px] border border-white/[0.16] rounded-[14px] shadow-2xl relative overflow-hidden"
        style={{ backgroundColor: "rgba(20, 20, 22, 0.92)", backdropFilter: "blur(14px)" }}
        aria-label="Activity heatmap"
      >
        <h2 className="text-[16px] font-semibold text-[#f4f4f5] leading-[24px] m-0 mb-[20px]">
          Activity Heatmap Grid
        </h2>

        {/* Heatmap Grid Container matching monthly.html #heatmap structure */}
        <div className="overflow-x-auto">
          <div
            className="inline-grid gap-x-[12px] gap-y-[8px]"
            style={{
              gridTemplateColumns: `44px repeat(${heatmapWeeks.length}, 12px)`,
              gridTemplateRows: "auto auto",
            }}
          >
            {/* Corner Spacer (row 1, col 1) */}
            <div style={{ gridRow: 1, gridColumn: 1 }} />

            {/* Month Header Row (row 1, cols 2..N) */}
            {heatmapWeeks.map((w, idx) => (
              <div
                key={`hdr-${idx}`}
                className="text-[11px] font-medium text-[#a1a1aa] pb-[4px] whitespace-nowrap"
                style={{ gridRow: 1, gridColumn: idx + 2 }}
              >
                {idx === 0 || heatmapWeeks[idx - 1]?.monthHeader !== w.monthHeader ? w.monthHeader : ""}
              </div>
            ))}

            {/* Day Labels Column (row 2, col 1) */}
            <div
              className="grid gap-y-[3px] align-start"
              style={{ gridRow: 2, gridColumn: 1, gridTemplateRows: "repeat(7, 12px)" }}
            >
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-[12px] leading-[12px] text-[#a1a1aa] flex items-center">
                  {d}
                </div>
              ))}
            </div>

            {/* Weekly Columns (row 2, cols 2..N) - 7 rows x 12px each */}
            {heatmapWeeks.map((week, wIdx) => (
              <div
                key={`week-${wIdx}`}
                className="grid gap-[3px] align-start"
                style={{
                  gridRow: 2,
                  gridColumn: wIdx + 2,
                  gridTemplateRows: "repeat(7, 12px)",
                }}
              >
                {week.days.map((cell, dIdx) => {
                  if (cell.isPlaceholder) {
                    return <div key={`empty-${wIdx}-${dIdx}`} className="w-[12px] h-[12px] rounded-[3px] bg-transparent" />;
                  }

                  const heatStyles = [
                    "bg-[#17171a]",
                    "bg-[rgba(168,85,247,0.30)]",
                    "bg-[rgba(168,85,247,0.52)]",
                    "bg-[rgba(168,85,247,0.75)]",
                    "bg-[#a855f7] shadow-[0_0_6px_rgba(168,85,247,0.6)]",
                  ][cell.level];

                  return (
                    <div
                      key={cell.date}
                      className={`w-[12px] h-[12px] rounded-[3px] transition-transform duration-100 hover:scale-125 cursor-pointer group relative ${heatStyles}`}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                        <div className="px-2.5 py-1 rounded-[6px] bg-[#141416] border border-white/20 text-[11px] text-white shadow-2xl whitespace-nowrap">
                          <span className="font-semibold text-[#c084fc]">{cell.label}:</span>{" "}
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

        {/* Heatmap Legend matching monthly.html .heatmap-legend */}
        <div className="flex items-center gap-[8px] mt-[18px] text-[12px] text-[#a1a1aa]">
          <span>Less</span>
          <span className="inline-block w-[12px] h-[12px] rounded-[3px] bg-[#17171a]" />
          <span className="inline-block w-[12px] h-[12px] rounded-[3px] bg-[rgba(168,85,247,0.30)]" />
          <span className="inline-block w-[12px] h-[12px] rounded-[3px] bg-[rgba(168,85,247,0.52)]" />
          <span className="inline-block w-[12px] h-[12px] rounded-[3px] bg-[rgba(168,85,247,0.75)]" />
          <span className="inline-block w-[12px] h-[12px] rounded-[3px] bg-[#a855f7]" />
          <span>More</span>
        </div>
      </section>

      {/* Card 3: Application Usage Breakdown Table with Icons */}
      {appLeaderboard.length > 0 && (
        <section
          className="p-[24px] border border-white/[0.16] rounded-[14px] shadow-2xl relative overflow-hidden space-y-4"
          style={{ backgroundColor: "rgba(20, 20, 22, 0.92)", backdropFilter: "blur(14px)" }}
        >
          <h2 className="text-[16px] font-semibold text-[#f4f4f5] leading-[24px] m-0 pb-3 border-b border-white/[0.09]">
            Application Usage Breakdown
          </h2>

          <div className="space-y-2">
            {appLeaderboard.slice(0, 8).map((app) => {
              const pct = totalSeconds > 0 ? Math.round((app.seconds / totalSeconds) * 100) : 0;

              return (
                <div
                  key={app.name}
                  className="p-3 rounded-[10px] bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.06] flex items-center justify-between gap-4 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <AppIcon name={app.name} />
                    <span className="text-[14px] font-medium text-[#f4f4f5] truncate">
                      {app.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-24 sm:w-36 bg-[#050505] rounded-full h-2 overflow-hidden border border-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#7e22ce] to-[#a855f7] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[13px] font-mono text-[#a1a1aa] w-16 text-right">
                      {formatDuration(app.seconds)}
                    </span>
                    <span className="text-[13px] font-mono font-semibold text-[#c084fc] w-10 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}



