import { useRef, useState, useCallback } from "react";

export function SummaryCard({ title, value, subtext, badge, subtextType }) {
  const cardRef = useRef(null);
  const [pos, setPos] = useState({ x: -500, y: -500 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative rounded-[14px] p-[1px] overflow-hidden bg-[#27272a] shadow-glass transition-all duration-200"
    >
      {/* Luminous Border Glow Layer */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(240px circle at ${pos.x}px ${pos.y}px, #004fff 0%, #31afd4 35%, transparent 75%)`,
        }}
      />

      {/* Inner Dark Surface */}
      <div
        className="flex flex-col p-5 rounded-[13px] bg-[#141416] w-full h-full relative overflow-hidden"
        style={{ backdropFilter: "blur(14px)" }}
      >
        {/* Surface Glow Layer */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(240px circle at ${pos.x}px ${pos.y}px, rgba(0, 79, 255, 0.22), transparent 65%)`,
          }}
        />

        {/* Content */}
        <div className="relative z-10">
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
      </div>
    </div>
  );
}
