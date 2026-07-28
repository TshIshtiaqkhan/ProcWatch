export function Slider({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit = "",
  badgeText,
  onChange,
}) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-slate-200 tracking-wide">{label}</span>
          {description && (
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {badgeText && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {badgeText}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-indigo-300 font-mono text-xs font-semibold tabular-nums shadow-inner">
            {value}{unit}
          </span>
        </div>
      </div>
      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${percentage}%, #1e293b ${percentage}%, #1e293b 100%)`
          }}
          className="custom-slider"
        />
      </div>
      <div className="flex justify-between text-[11px] font-medium text-slate-500 px-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

