import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CHART_COLORS, formatDuration, formatYAxis } from "../../lib/constants";

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];

  return (
    <div className="p-3 rounded-xl glass-panel border border-slate-700/80 shadow-xl space-y-1">
      <div className="text-xs font-bold text-white">{item.payload.app_name}</div>
      <div className="text-xs font-mono text-indigo-300 font-medium">
        {formatDuration(item.value)}
      </div>
    </div>
  );
}

export function AppBarChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data.slice(0, 10)}
        layout="vertical"
        margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
      >
        <XAxis
          type="number"
          tickFormatter={formatYAxis}
          stroke="#64748b"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: "#334155" }}
        />
        <YAxis
          type="category"
          dataKey="app_name"
          width={110}
          stroke="#9ca3af"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="seconds" radius={[0, 6, 6, 0]}>
          {data.slice(0, 10).map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

