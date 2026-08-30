export function GlassCard({ children, className = "", ...props }) {
  return (
    <div
      className={`rounded-[14px] border border-[#27272a] shadow-glass relative overflow-hidden transition-all duration-200 ${className}`}
      style={{ backgroundColor: "rgba(20, 20, 22, 0.92)", backdropFilter: "blur(14px)" }}
      {...props}
    >
      {children}
    </div>
  );
}
