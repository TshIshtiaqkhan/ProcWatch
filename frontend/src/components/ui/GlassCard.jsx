export function GlassCard({ children, className = "", ...props }) {
  return (
    <div
      className={`rounded-[14px] border border-white/[0.16] shadow-2xl relative overflow-hidden ${className}`}
      style={{ backgroundColor: "rgba(20, 20, 22, 0.92)", backdropFilter: "blur(14px)" }}
      {...props}
    >
      {children}
    </div>
  );
}
