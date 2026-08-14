import { useNavigate } from "react-router-dom";
import { formatDuration } from "../../lib/constants";
import {
  SiGooglechrome,
  SiSpotify,
  SiZoom,
  SiFirefox,
  SiDiscord,
  SiFigma,
  SiBrave,
  SiNotion,
  SiTelegram
} from "react-icons/si";
import { FaSlack, FaTerminal } from "react-icons/fa";
import { VscVscode } from "react-icons/vsc";

const AppIcon = ({ name }) => {
  const n = (name || "").toLowerCase();
  if (n.includes("chrome")) return <SiGooglechrome color="#4285F4" size={18} />;
  if (n.includes("slack")) return <FaSlack color="#E01E5A" size={18} />;
  if (n.includes("code") || n.includes("codium")) return <VscVscode color="#007ACC" size={18} />;
  if (n.includes("spotify")) return <SiSpotify color="#1DB954" size={18} />;
  if (n.includes("zoom")) return <SiZoom color="#2D8CFF" size={18} />;
  if (n.includes("firefox")) return <SiFirefox color="#FF7139" size={18} />;
  if (n.includes("discord")) return <SiDiscord color="#5865F2" size={18} />;
  if (n.includes("figma")) return <SiFigma color="#F24E1E" size={18} />;
  if (n.includes("brave")) return <SiBrave color="#FF1B2D" size={18} />;
  if (n.includes("notion")) return <SiNotion color="#FFFFFF" size={18} />;
  if (n.includes("telegram")) return <SiTelegram color="#26A5E4" size={18} />;
  if (n.includes("terminal") || n.includes("konsole") || n.includes("kitty") || n.includes("alacritty") || n.includes("bash")) {
    return <FaTerminal color="#A1A1AA" size={16} />;
  }
  return (
    <div className="w-[20px] h-[20px] rounded-[5px] flex items-center justify-center text-[10px] font-bold bg-[#27272a] text-[#e4e4e7] border border-white/10 uppercase">
      {name.slice(0, 1)}
    </div>
  );
};

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

