export function Toggle({ label, description, icon: Icon, checked, onChange }) {
  return (
    <div
      className="flex items-center justify-between p-3.5 rounded-xl bg-[#17171a] border border-[#27272a] hover:border-[#004fff]/40 cursor-pointer group transition-all"
      onClick={() => onChange(!checked)}
    >
      <div className="flex items-start gap-3 pr-4">
        {Icon && (
          <div className="p-2 rounded-lg bg-[#004fff]/10 text-[#31afd4] group-hover:bg-[#004fff]/20 transition-colors mt-0.5">
            <Icon size={16} />
          </div>
        )}
        <div>
          <span className="text-xs font-semibold text-[#f4f4f5] group-hover:text-white transition-colors">
            {label}
          </span>
          {description && (
            <p className="text-[11px] text-[#71717a] mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <div
        className={`relative shrink-0 w-11 h-6 rounded-full transition-all duration-200 ${
          checked
            ? "bg-[#004fff] shadow-[0_0_12px_rgba(0,79,255,0.5)] border border-[#004fff]/60"
            : "bg-[#3f3f46] border border-white/[0.08]"
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-md ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
}
