// 6-Color Categorical Charting Palette (from design.md specification)
export const CHART_COLORS = [
  "#3b82f6", // Electric Blue
  "#22d3ee", // Cyan
  "#f472b6", // Soft Pink
  "#4ade80", // Mint Green
  "#a78bfa", // Violet
  "#94a3b8", // Slate
];

export function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatYAxis(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h${minutes > 0 ? minutes + "m" : ""}`;
  return `${minutes}m`;
}

function toLocalDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDateString() {
  return toLocalDateString(new Date());
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateString(d);
}

export const RANGE_PRESETS_MONTHLY = [
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
  { label: "Custom Range", days: 0 },
];

export const RANGE_PRESETS_APP_DETAIL = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "Custom", days: 0 },
];
