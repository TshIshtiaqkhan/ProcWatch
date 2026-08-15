export function RangeSwitcher({ presets, activeIndex, onSelect, customStart, customEnd, onCustomStartChange, onCustomEndChange, customIndex = 3 }) {
  return (
    <div className="flex flex-col items-end gap-3 shrink-0">
      <div
        className="inline-flex items-center gap-[2px] p-[4px] border border-white/[0.16] rounded-full shadow-xl"
        style={{ backgroundColor: "rgba(20, 20, 22, 0.92)", backdropFilter: "blur(14px)" }}
        role="group"
        aria-label="Date range"
      >
        {presets.map((p, i) => (
          <button
            key={p.label}
            onClick={() => onSelect(i)}
            className={`border-none bg-transparent text-[13px] font-medium px-[16px] py-[8px] rounded-full transition-all whitespace-nowrap cursor-pointer ${i === activeIndex ? "bg-[#a855f7] text-white font-semibold" : "text-[#a1a1aa] hover:text-[#f4f4f5]"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {activeIndex === customIndex && (
        <div className="flex items-center gap-2">
          <input type="date" value={customStart} onChange={(e) => onCustomStartChange(e.target.value)} className="bg-[#141416] border border-white/10 text-purple-300 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-[#a855f7]" />
          <span className="text-xs text-[#a1a1aa]">to</span>
          <input type="date" value={customEnd} onChange={(e) => onCustomEndChange(e.target.value)} className="bg-[#141416] border border-white/10 text-purple-300 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-[#a855f7]" />
        </div>
      )}
    </div>
  );
}
