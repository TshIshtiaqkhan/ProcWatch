export function RangeSwitcher({
  presets,
  activeIndex,
  onSelect,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  customIndex = 3,
}) {
  return (
    <div className="flex flex-col items-end gap-2.5 shrink-0">
      <div
        className="inline-flex items-center gap-[2px] p-1 border border-[#27272a] rounded-full shadow-glass"
        style={{ backgroundColor: "rgba(20, 20, 22, 0.92)", backdropFilter: "blur(14px)" }}
        role="group"
        aria-label="Date range"
      >
        {presets.map((p, i) => (
          <button
            key={p.label}
            onClick={() => onSelect(i)}
            className={`border-none text-xs px-3.5 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap cursor-pointer ${
              i === activeIndex
                ? "bg-[#004fff] text-white font-semibold shadow-[0_0_15px_rgba(0,79,255,0.45)] border border-[#004fff]/60"
                : "bg-transparent text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/[0.04]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {activeIndex === customIndex && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className="bg-[#1f1f22] border border-[#27272a] text-xs text-[#f4f4f5] rounded-lg px-2.5 py-1 outline-none focus:border-[#004fff] focus:shadow-[0_0_10px_rgba(0,79,255,0.3)] transition-all font-mono"
          />
          <span className="text-xs text-[#71717a]">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className="bg-[#1f1f22] border border-[#27272a] text-xs text-[#f4f4f5] rounded-lg px-2.5 py-1 outline-none focus:border-[#004fff] focus:shadow-[0_0_10px_rgba(0,79,255,0.3)] transition-all font-mono"
          />
        </div>
      )}
    </div>
  );
}
