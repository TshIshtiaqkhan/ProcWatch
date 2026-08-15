import { useNavigate } from "react-router-dom";
import { formatDuration } from "../../lib/constants";
import { AppIcon } from "../ui/AppIcon";

export function AppUsageList({ data }) {
  const navigate = useNavigate();

  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-1">
      {data.map((item) => (
        <div
          key={item.app_name}
          onClick={() =>
            navigate(`/app/${encodeURIComponent(item.app_name)}`)
          }
          className="flex items-center justify-between px-3 py-[9px] rounded-lg hover:bg-white/[0.035] cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <AppIcon name={item.app_name} />
            <span className="text-[14px] font-medium text-[#f4f4f5]">
              {item.app_name}
            </span>
          </div>
          <span className="font-mono text-[13px] text-[#a1a1aa]">
            {formatDuration(item.seconds)}
          </span>
        </div>
      ))}
    </div>
  );
}
