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
          <span className="text-xs font-semibold text-[#f4f4f5] tracking-wide">{label}</span>
          {description && (
            <p className="text-[11px] text-[#71717a] mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {badgeText && (
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#004fff]/15 text-[#31afd4] border border-[#004fff]/30">
              {badgeText}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-[#17171a] border border-[#27272a] text-[#31afd4] font-mono text-xs font-bold tabular-nums">
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
            background: `linear-gradient(to right, #004fff 0%, #31afd4 ${percentage}%, #1f1f22 ${percentage}%, #1f1f22 100%)`
          }}
          className="custom-slider"
        />
      </div>
      <div className="flex justify-between text-[11px] font-mono text-[#71717a] px-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
