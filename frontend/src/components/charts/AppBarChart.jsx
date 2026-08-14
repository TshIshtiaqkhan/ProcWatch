import { useState, useEffect } from "react";

export function AppBarChart({ data }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // slight delay to trigger CSS transition
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) return null;

  const maxHours = 6;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-[18px]">
        {data.slice(0, 5).map((row) => {
          const hours = row.seconds / 3600;
          const pct = Math.min((hours / maxHours) * 100, 100);

          return (
            <div
              key={row.app_name}
              className="grid items-center gap-[12px]"
              style={{ gridTemplateColumns: "120px 1fr" }}
            >
              <div className="text-[13px] text-[#a1a1aa] text-right whitespace-nowrap overflow-hidden text-ellipsis">
                {row.app_name}
              </div>
              <div className="relative h-[20px] w-full">
                <div
                  className="h-full rounded-[4px] bg-gradient-to-r from-[#7e22ce] to-[#a855f7] transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ width: mounted ? `${pct}%` : "0%" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="grid gap-[12px] mt-1"
        style={{ gridTemplateColumns: "120px 1fr" }}
      >
        <div></div>
        <div className="relative h-[16px] font-mono text-[12px] text-[#a1a1aa] mt-1">
          <span
            className="absolute top-0"
            style={{ left: "0%", transform: "translateX(0)" }}
          >
            0
          </span>
          <span
            className="absolute top-0"
            style={{ left: "25%", transform: "translateX(-50%)" }}
          >
            1.5h
          </span>
          <span
            className="absolute top-0"
            style={{ left: "50%", transform: "translateX(-50%)" }}
          >
            3h
          </span>
          <span
            className="absolute top-0"
            style={{ left: "75%", transform: "translateX(-50%)" }}
          >
            4.5h
          </span>
          <span
            className="absolute top-0"
            style={{ left: "100%", transform: "translateX(-100%)" }}
          >
            6h
          </span>
        </div>
      </div>
    </div>
  );
}
