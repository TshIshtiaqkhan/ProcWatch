import { useRef, useState, useCallback } from "react";

/**
 * SpotlightCard — Magic UI style card with a luminous cursor-following
 * border glow (#004fff -> #31afd4) and subtle surface spotlight.
 * Used strictly for top-level KPI / metric cards.
 */
export function SpotlightCard({ children, className = "", innerClassName = "" }) {
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
      className={`group relative rounded-[14px] p-[1px] overflow-hidden bg-[#27272a] shadow-glass transition-all duration-200 ${className}`}
    >
      {/* Luminous Border Glow Layer */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(260px circle at ${pos.x}px ${pos.y}px, #004fff 0%, #31afd4 35%, transparent 75%)`,
        }}
      />

      {/* Inner Dark Surface */}
      <div
        className={`relative rounded-[13px] bg-[#141416] w-full h-full overflow-hidden ${innerClassName || "p-5"}`}
        style={{ backdropFilter: "blur(14px)" }}
      >
        {/* Surface Glow Layer */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(260px circle at ${pos.x}px ${pos.y}px, rgba(0, 79, 255, 0.22), transparent 65%)`,
          }}
        />

        {/* Card Content */}
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
