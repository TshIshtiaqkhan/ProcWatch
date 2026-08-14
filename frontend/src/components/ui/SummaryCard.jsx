export function SummaryCard({ title, value, subtext, badge, subtextType }) {
  return (
    <div className="flex flex-col p-5 rounded-[14px] border border-white/[0.16] shadow-xl relative overflow-hidden" style={{ backgroundColor: 'rgba(20, 20, 22, 0.92)', backdropFilter: 'blur(14px)' }}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-[13px] font-medium text-[#a1a1aa] tracking-wide">{title}</h3>
        {badge && (
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold">
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-[34px] font-bold text-white tracking-tight leading-none">
          {value}
        </span>
      </div>
      {subtext && (
        <p className={`text-xs mt-3 ${subtextType === 'positive' ? 'text-emerald-400' : subtextType === 'negative' ? 'text-rose-400' : 'text-[#a1a1aa]'}`}>
          {subtext}
        </p>
      )}
    </div>
  );
}
