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
          onClick={() => navigate(`/app/${encodeURIComponent(item.app_name)}`)}
          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] cursor-pointer transition-all duration-200 group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <AppIcon name={item.app_name} size={18} />
            <span className="text-xs font-semibold text-[#f4f4f5] group-hover:text-white truncate">
              {item.app_name}
            </span>
          </div>
          <span className="font-mono text-xs text-[#a1a1aa] group-hover:text-[#31afd4] transition-colors shrink-0 ml-2">
            {formatDuration(item.seconds)}
          </span>
        </div>
      ))}
    </div>
  );
}
