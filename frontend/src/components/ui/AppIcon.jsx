import { SiGooglechrome, SiSpotify, SiZoom, SiFirefox, SiDiscord, SiFigma, SiBrave, SiNotion, SiTelegram } from "react-icons/si";
import { FaSlack, FaTerminal } from "react-icons/fa";
import { VscVscode } from "react-icons/vsc";

const ICON_MAP = [
  { match: (n) => n.includes("chrome"), component: SiGooglechrome, color: "#4285F4", sizeAdj: 0 },
  { match: (n) => n.includes("slack"), component: FaSlack, color: "#E01E5A", sizeAdj: 0 },
  { match: (n) => n.includes("code") || n.includes("codium"), component: VscVscode, color: "#007ACC", sizeAdj: 0 },
  { match: (n) => n.includes("spotify"), component: SiSpotify, color: "#1DB954", sizeAdj: 0 },
  { match: (n) => n.includes("zoom"), component: SiZoom, color: "#2D8CFF", sizeAdj: 0 },
  { match: (n) => n.includes("firefox"), component: SiFirefox, color: "#FF7139", sizeAdj: 0 },
  { match: (n) => n.includes("discord"), component: SiDiscord, color: "#5865F2", sizeAdj: 0 },
  { match: (n) => n.includes("figma"), component: SiFigma, color: "#F24E1E", sizeAdj: 0 },
  { match: (n) => n.includes("brave"), component: SiBrave, color: "#FF1B2D", sizeAdj: 0 },
  { match: (n) => n.includes("notion"), component: SiNotion, color: "#FFFFFF", sizeAdj: 0 },
  { match: (n) => n.includes("telegram"), component: SiTelegram, color: "#26A5E4", sizeAdj: 0 },
  { match: (n) => ["terminal", "konsole", "kitty", "alacritty", "bash"].some(k => n.includes(k)), component: FaTerminal, color: "#A1A1AA", sizeAdj: -2 }
];

export function AppIcon({ name, size = 18 }) {
  const n = name?.toLowerCase() || "";
  
  const iconConfig = ICON_MAP.find(config => config.match(n));
  
  if (iconConfig) {
    const Icon = iconConfig.component;
    return <Icon size={size + iconConfig.sizeAdj} color={iconConfig.color} />;
  }

  return (
    <div 
      className="flex items-center justify-center bg-[#2A2A30] text-gray-300 font-bold rounded-lg shadow-inner"
      style={{ width: size + 6, height: size + 6, fontSize: size * 0.6 }}
    >
      {name ? name.charAt(0).toUpperCase() : "?"}
    </div>
  );
}
