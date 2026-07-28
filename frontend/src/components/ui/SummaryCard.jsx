export function SummaryCard({ label, value, sub, icon: Icon, badge, trend }) {
  return (
    <div className="relative overflow-hidden p-5 rounded-2xl glass-panel border border-slate-800/80 shadow-xl group hover:border-indigo-500/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        {Icon && (
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all">
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
          {value}
        </span>
        {badge && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
            {badge}
          </span>
        )}
      </div>
      {sub && (
        <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1 font-medium">
          {sub}
        </div>
      )}
    </div>
  );
}

