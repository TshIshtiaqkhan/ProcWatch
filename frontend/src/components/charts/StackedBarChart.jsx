import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CHART_COLORS, formatYAxis, formatDuration } from "../../lib/constants";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  return (
    <div className="p-4 rounded-xl glass-panel border border-slate-700/80 shadow-2xl space-y-2 min-w-[200px]">
      <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
        <span className="text-xs font-bold text-white uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono font-semibold text-indigo-300">{formatDuration(total)}</span>
      </div>
      <div className="space-y-1.5 pt-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-300 font-medium">{entry.name}</span>
            </div>
            <span className="text-slate-200 font-mono font-medium">{formatDuration(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StackedBarChart({ data, apps }) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="day"
          stroke="#64748b"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: "#334155" }}
        />
        <YAxis
          tickFormatter={formatYAxis}
          stroke="#64748b"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: "#334155" }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: "16px" }}
          formatter={(value) => (
            <span className="text-xs text-slate-300 font-medium px-1">{value}</span>
          )}
        />
        {apps.map((app, i) => (
          <Bar
            key={app}
            dataKey={app}
            stackId="a"
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            radius={i === apps.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

