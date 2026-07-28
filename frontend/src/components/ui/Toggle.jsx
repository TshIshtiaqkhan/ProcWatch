export function Toggle({ label, description, icon: Icon, checked, onChange }) {
  return (
    <div
      className="flex items-center justify-between p-3.5 rounded-xl glass-panel-interactive cursor-pointer group"
      onClick={() => onChange(!checked)}
    >
      <div className="flex items-start gap-3 pr-4">
        {Icon && (
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors mt-0.5">
            <Icon size={16} />
          </div>
        )}
        <div>
          <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
            {label}
          </span>
          {description && (
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <div
        className={`relative shrink-0 w-11 h-6 rounded-full transition-all duration-300 ${
          checked
            ? "bg-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.5)] border border-indigo-400/40"
            : "bg-slate-800 border border-slate-700/60"
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-md ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
}

