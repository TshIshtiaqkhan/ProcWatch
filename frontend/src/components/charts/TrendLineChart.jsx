import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS, formatDuration, formatYAxis } from "../../lib/constants";

export function TrendLineChart({ data }) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <XAxis dataKey="date" stroke="#71717a" fontSize={11} axisLine={{ stroke: "#27272a" }} />
        <YAxis tickFormatter={formatYAxis} stroke="#71717a" fontSize={11} axisLine={{ stroke: "#27272a" }} />
        <Tooltip
          formatter={(value) => [formatDuration(value), "Time"]}
          contentStyle={{
            backgroundColor: "#141416",
            border: "1px solid #27272a",
            borderRadius: "10px",
            color: "#f4f4f5",
            fontSize: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        />

        <Line
          type="monotone"
          dataKey="seconds"
          stroke={CHART_COLORS[0]}
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#31afd4", stroke: "#004fff", strokeWidth: 1.5 }}
          activeDot={{ r: 5, fill: "#31afd4", stroke: "#ffffff", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
