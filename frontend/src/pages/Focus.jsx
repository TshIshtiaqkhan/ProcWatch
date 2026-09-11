import { useState, useEffect, useCallback } from "react";
import { Target, AlertTriangle, CheckCircle2, Coffee, Play, X, SkipForward } from "lucide-react";
import confetti from "canvas-confetti";
import { useFocusSession } from "../hooks/useFocusSession";
import { SummaryCard } from "../components/ui/SummaryCard";
import { GlassCard } from "../components/ui/GlassCard";
import { FocusHistoryChart } from "../components/charts/FocusHistoryChart";
import { LoadingState } from "../components/ui/LoadingState";
import { formatDuration, todayDateString, daysAgo } from "../lib/constants";

const DURATION_OPTIONS = [15, 25, 45, 60];

function TimerRing({ remainingSeconds, totalSeconds, color = "#004fff", glowColor = "rgba(0,79,255,0.4)" }) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const offset = circumference * (1 - progress);

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const display = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div className="relative w-[200px] h-[200px] mx-auto">
      <svg width="200" height="200" className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx="100" cy="100" r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth="6"
        />
        {/* Progress ring */}
        <circle
          cx="100" cy="100" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1s linear",
            filter: `drop-shadow(0 0 8px ${glowColor})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[40px] font-extrabold text-white tracking-tight leading-none font-mono">
          {display}
        </span>
        <span className="text-[11px] text-[#71717a] mt-1.5 font-medium">remaining</span>
      </div>
    </div>
  );
}

function DurationPicker({ selected, onChange }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {DURATION_OPTIONS.map((min) => (
        <button
          key={min}
          type="button"
          onClick={() => onChange(min)}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
            selected === min
              ? "bg-[#004fff] text-white border-[#004fff]/80 shadow-[0_0_15px_rgba(0,79,255,0.35)]"
              : "bg-white/[0.04] text-[#a1a1aa] border-white/[0.09] hover:text-[#f4f4f5] hover:bg-white/[0.08]"
          }`}
        >
          {min}m
        </button>
      ))}
    </div>
  );
}

export function Focus() {
  const {
    state,
    remainingSeconds,
    distractions,
    durationMinutes,
    lastResult,
    start,
    stop,
    dismissResult,
    startBreak,
    skipBreak,
  } = useFocusSession();

  const [selectedDuration, setSelectedDuration] = useState(25);
  const [todayStats, setTodayStats] = useState({ sessions: 0, minutes: 0, distractions: 0 });
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Load history & today stats ────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!window.electronAPI?.getFocusHistory) {
      setLoading(false);
      return;
    }
    try {
      const today = todayDateString();
      const weekAgo = daysAgo(6);

      const historyRes = await window.electronAPI.getFocusHistory(weekAgo, today);
      if (historyRes?.success && historyRes.data) {
        setHistoryData(historyRes.data);

        // Extract today's stats from history
        const todayRow = historyRes.data.find((d) => d.date === today);
        if (todayRow) {
          setTodayStats({
            sessions: todayRow.completedCount,
            minutes: todayRow.totalMinutes,
            distractions: todayRow.totalDistractions,
          });
        } else {
          setTodayStats({ sessions: 0, minutes: 0, distractions: 0 });
        }
      }
    } catch (err) {
      console.error("Failed to fetch focus history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data when a session completes or is cancelled
  useEffect(() => {
    if (state === "completed" || (state === "idle" && lastResult)) {
      fetchData();
    }
  }, [state, lastResult, fetchData]);

  // ── Confetti on completion ────────────────────────────────────────────────

  useEffect(() => {
    if (state === "completed") {
      const end = Date.now() + 2500;
      const colors = ["#004fff", "#31afd4", "#ff007f", "#34d399", "#22d3ee"];
      const frame = () => {
        if (Date.now() > end) return;
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          startVelocity: 60,
          origin: { x: 0, y: 0.8 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          startVelocity: 60,
          origin: { x: 1, y: 0.8 },
          colors,
        });
        requestAnimationFrame(frame);
      };
      frame();
    }
  }, [state]);

  // ── Sync selected duration from settings ──────────────────────────────────

  useEffect(() => {
    if (!window.electronAPI?.getSettings) return;
    window.electronAPI.getSettings().then((res) => {
      if (res?.success && res.data?.focus_session_duration_minutes) {
        const dur = parseInt(res.data.focus_session_duration_minutes, 10);
        if (DURATION_OPTIONS.includes(dur)) {
          setSelectedDuration(dur);
        }
      }
    });
  }, []);

  if (loading) {
    return <LoadingState message="Initializing focus engine..." />;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-7 max-w-[1400px] mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Hero Timer Section */}
      <GlassCard className="p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* ── IDLE STATE ── */}
          {state === "idle" && !lastResult && (
            <>
              <div className="flex items-center gap-2.5">
                <Target size={20} className="text-[#31afd4]" />
                <h1 className="text-2xl font-bold text-white tracking-tight">Focus Mode</h1>
              </div>
              <p className="text-xs text-[#a1a1aa] max-w-md leading-relaxed">
                Start a focused work session. Apps marked as distracting in your category settings will be flagged automatically.
              </p>
              <DurationPicker selected={selectedDuration} onChange={setSelectedDuration} />
              <button
                type="button"
                onClick={() => start(selectedDuration)}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white bg-[#004fff] hover:bg-[#31afd4] shadow-[0_0_20px_rgba(0,79,255,0.45)] transition-all cursor-pointer border border-[#004fff]/50"
              >
                <Play size={18} />
                Start Focus
              </button>
            </>
          )}

          {/* ── RUNNING STATE ── */}
          {state === "running" && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#004fff] animate-pulse shadow-[0_0_8px_rgba(0,79,255,0.6)]" />
                <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Focus Session Active</span>
              </div>
              <TimerRing
                remainingSeconds={remainingSeconds}
                totalSeconds={durationMinutes * 60}
                color="#004fff"
                glowColor="rgba(0,79,255,0.4)"
              />
              <div className={`flex items-center gap-1.5 text-xs font-medium ${distractions > 0 ? "text-[#fb7185]" : "text-[#71717a]"}`}>
                <AlertTriangle size={14} />
                <span>{distractions} distraction{distractions !== 1 ? "s" : ""}</span>
              </div>
              <button
                type="button"
                onClick={stop}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-[#a1a1aa] bg-white/[0.04] border border-white/[0.09] hover:text-[#f4f4f5] hover:bg-white/[0.08] transition-all cursor-pointer"
              >
                <X size={14} />
                Cancel Session
              </button>
            </>
          )}

          {/* ── COMPLETED STATE ── */}
          {state === "completed" && lastResult && (
            <>
              <div className="flex items-center gap-2 text-[#34d399]">
                <CheckCircle2 size={24} />
                <h2 className="text-xl font-bold text-white">Session Complete!</h2>
              </div>
              <div className="flex items-center gap-6 text-xs text-[#a1a1aa]">
                <span className="font-mono">{formatDuration(lastResult.durationSeconds)} focused</span>
                <span className="text-[#27272a]">|</span>
                <span className={`font-mono ${lastResult.distractions > 0 ? "text-[#fb7185]" : "text-[#34d399]"}`}>
                  {lastResult.distractions} distraction{lastResult.distractions !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startBreak(5)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#004fff] hover:bg-[#31afd4] shadow-[0_0_15px_rgba(0,79,255,0.35)] transition-all cursor-pointer border border-[#004fff]/50"
                >
                  <Coffee size={14} />
                  Take a Break (5m)
                </button>
                <button
                  type="button"
                  onClick={dismissResult}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-[#a1a1aa] bg-white/[0.04] border border-white/[0.09] hover:text-[#f4f4f5] hover:bg-white/[0.08] transition-all cursor-pointer"
                >
                  <SkipForward size={14} />
                  Skip
                </button>
              </div>
            </>
          )}

          {/* ── BREAK STATE ── */}
          {state === "break" && (
            <>
              <div className="flex items-center gap-2">
                <Coffee size={18} className="text-[#31afd4]" />
                <span className="text-xs font-semibold text-[#31afd4] uppercase tracking-wider">Break Time</span>
              </div>
              <TimerRing
                remainingSeconds={remainingSeconds}
                totalSeconds={5 * 60}
                color="#31afd4"
                glowColor="rgba(49,175,212,0.4)"
              />
              <p className="text-xs text-[#a1a1aa]">Stretch, hydrate, look away from the screen.</p>
              <button
                type="button"
                onClick={skipBreak}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-[#a1a1aa] bg-white/[0.04] border border-white/[0.09] hover:text-[#f4f4f5] hover:bg-white/[0.08] transition-all cursor-pointer"
              >
                <SkipForward size={14} />
                Skip Break
              </button>
            </>
          )}
        </div>
      </GlassCard>

      {/* Today's Focus Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title="Sessions Today"
          value={String(todayStats.sessions)}
          subtext={todayStats.sessions > 0 ? `${todayStats.sessions} completed` : "None yet"}
          subtextType="neutral"
        />
        <SummaryCard
          title="Focus Time"
          value={formatDuration(todayStats.minutes * 60)}
          subtext={todayStats.minutes > 0 ? "Total focused today" : "Start a session"}
          subtextType="neutral"
        />
        <SummaryCard
          title="Distractions"
          value={String(todayStats.distractions)}
          subtext={todayStats.distractions === 0 ? "Laser focused!" : `${todayStats.distractions} app switches`}
          subtextType={todayStats.distractions === 0 ? "positive" : "negative"}
        />
      </div>

      {/* 7-Day Focus History */}
      <GlassCard className="p-5 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
          <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
            Focus History — Last 7 Days
          </h2>
          <span className="text-[11px] text-[#71717a] font-mono">
            {historyData.reduce((s, d) => s + d.completedCount, 0)} sessions total
          </span>
        </div>
        <FocusHistoryChart data={historyData} />
      </GlassCard>
    </div>
  );
}
