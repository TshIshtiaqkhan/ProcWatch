import { useNavigate } from "react-router-dom";
import { CHART_COLORS, formatDuration } from "../../lib/constants";
import { ChevronRight } from "lucide-react";

export function AppUsageList({ data, totalSeconds }) {
  const navigate = useNavigate();

  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {data.map((item, index) => {
        const pct = totalSeconds > 0 ? (item.seconds / totalSeconds) * 100 : 0;
        const color = CHART_COLORS[index % CHART_COLORS.length];

        return (
          <div
            key={item.app_name}
            onClick={() =>
              navigate(`/app/${encodeURIComponent(item.app_name)}`)
            }
            className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-900/80 cursor-pointer transition-all group"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md border border-white/10 uppercase"
              style={{ backgroundColor: color }}
            >
              {item.app_name.slice(0, 2)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                  {item.app_name}
                </span>
                <span className="text-xs font-mono font-semibold text-slate-300">
                  {formatDuration(item.seconds)}
                </span>
              </div>

              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono font-medium text-slate-400 w-10 text-right">
                {pct.toFixed(0)}%
              </span>
              <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
