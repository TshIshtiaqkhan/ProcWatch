export function SummaryCard({ title, value, subtext, badge, subtextType }) {
  return (
    <div
      className="flex flex-col p-5 rounded-[14px] border border-[#27272a] shadow-glass relative overflow-hidden transition-all duration-200"
      style={{ backgroundColor: "rgba(20, 20, 22, 0.92)", backdropFilter: "blur(14px)" }}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">{title}</h3>
        {badge && (
          <span className="px-2.5 py-0.5 rounded-full bg-[#ff007f]/15 text-[#ff007f] border border-[#ff007f]/30 text-[11px] font-semibold tracking-wide shadow-[0_0_10px_rgba(255,0,127,0.25)]">
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-[32px] font-extrabold text-white tracking-tight leading-none">
          {value}
        </span>
      </div>
      {subtext && (
        <p
          className={`text-xs mt-3.5 font-medium flex items-center gap-1.5 ${
            subtextType === "positive"
              ? "text-[#34d399]"
              : subtextType === "negative"
              ? "text-[#fb7185]"
              : "text-[#a1a1aa]"
          }`}
        >
          {subtext}
        </p>
      )}
    </div>
  );
}
