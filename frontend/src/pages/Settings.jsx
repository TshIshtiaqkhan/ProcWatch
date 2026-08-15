import { useState } from "react";
import { useSettings } from "../hooks/useSettings";
import { useCategories } from "../hooks/useCategories";
import { AppIcon } from "../components/ui/AppIcon";
import { LoadingState } from "../components/ui/LoadingState";
import { GlassCard } from "../components/ui/GlassCard";

const SliderCard = ({ label, min, max, value, onChange, readoutTag, formatValue, unit }) => {
  const pct = Math.round(((value - min) / (max - min)) * 100);
  return (
    <div className="bg-[#17171a] border border-white/[0.09] rounded-[12px] p-[18px_20px]">
      <div className="flex justify-between items-baseline mb-[18px] gap-2">
        <span className="text-[16px] font-semibold text-[#f4f4f5]">{label}</span>
        <div className="flex items-baseline gap-[10px] whitespace-nowrap">
          <span className="text-[14px] text-[#a1a1aa]">{readoutTag}</span>
          <span className="font-mono text-[18px] font-semibold text-[#f4f4f5]">
            {formatValue ? formatValue(value) : `${value}${unit}`}
          </span>
        </div>
      </div>

      <div className="relative h-[6px] rounded-full bg-[#1f1f22] mb-[12px]">
        <div
          className="absolute top-0 left-0 bottom-0 rounded-full bg-gradient-to-r from-[#7e22ce] to-[#a855f7]"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 w-[18px] h-[18px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.4),0_0_0_4px_rgba(168,85,247,0.18)] -translate-x-1/2 -translate-y-1/2 cursor-pointer pointer-events-none"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute -top-2 left-0 w-full h-[26px] opacity-0 cursor-pointer m-0"
        />
      </div>

      <div className="flex justify-between font-mono text-[13px] text-[#a1a1aa]">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
};

const SwitchToggle = ({ label, checked, onChange }) => (
  <div className="bg-[#17171a] border border-white/[0.09] rounded-[12px] p-[16px_20px] flex items-center justify-between gap-4">
    <span className="text-[15px] font-semibold text-[#f4f4f5]">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-[46px] h-[26px] shrink-0 rounded-full transition-colors cursor-pointer border-none ${
        checked ? "bg-gradient-to-r from-[#7e22ce] to-[#a855f7]" : "bg-[#3f3f46]"
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-md transition-transform duration-160 ${
          checked ? "translate-x-[20px]" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

export function Settings() {
  const { settings, update } = useSettings();
  const { categories, add, remove } = useCategories();
  const [newAppName, setNewAppName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [clearConfirm, setClearConfirm] = useState("");
  const [exportFormat, setExportFormat] = useState("json");
  const [exportStatus, setExportStatus] = useState(null);

  if (!settings || Object.keys(settings).length === 0) {
    return <LoadingState message="Loading preference engine..." />;
  }

  const pollInterval = Number(settings.polling_interval_seconds ?? 5);
  const idleThreshold = Number(settings.idle_threshold_seconds ?? 90);

  const handleExport = async (format) => {
    const fmt = format || exportFormat;
    setExportFormat(fmt);
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.exportData(fmt);
      if (res && res.success) {
        setExportStatus(`Exported to ${res.path || "file"}`);
        setTimeout(() => setExportStatus(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClear = async () => {
    if (clearConfirm.trim() !== "DELETE" || !window.electronAPI) return;
    await window.electronAPI.clearAllData();
    setClearConfirm("");
    alert("All tracking data has been permanently cleared.");
  };

  return (
    <div className="p-[28px_34px] max-w-[1400px] mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Hero Panel matching setting.html .hero-panel */}
      <GlassCard className="p-[24px_28px]">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <span className="inline-flex items-center px-[14px] py-[6px] rounded-full bg-[#17171a] border border-white/[0.16] text-[13px] font-medium text-[#a1a1aa]">
            ProcWatch Preferences
          </span>
          <span className="inline-flex items-center gap-2 px-[16px] py-[7px] rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[13px] font-semibold text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.2)] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            100% Offline Mode
          </span>
        </div>
        <h1 className="mt-[16px] text-[34px] font-extrabold text-[#f4f4f5] leading-[1.15] tracking-[-0.02em] m-0">
          Settings &amp; Engine Control
        </h1>
        <p className="mt-[12px] text-[15px] leading-[22px] text-[#a1a1aa] max-w-[720px] m-0">
          Configure background tracking intervals, system autostart options, application tags, and local SQLite data persistence.
        </p>
      </GlassCard>

      {/* Tracking Engine Calibration Section matching setting.html .calibration-grid */}
      <GlassCard
        className="p-[24px_28px]"
        aria-label="Tracking engine calibration"
      >
        <h2 className="text-[20px] font-bold text-[#f4f4f5] tracking-[-0.01em] m-0">
          Tracking Engine Calibration
        </h2>
        <p className="mt-[8px] mb-[22px] text-[14px] text-[#a1a1aa] m-0">
          Adjust how frequently active window polls are recorded and when idle detection triggers.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          <SliderCard
            label="Polling Frequency"
            min={1}
            max={60}
            value={pollInterval}
            unit="s"
            readoutTag={pollInterval <= 3 ? "High Accuracy" : pollInterval <= 10 ? "Balanced" : "Battery Saver"}
            onChange={(v) => update({ polling_interval_seconds: String(v) })}
          />

          <SliderCard
            label="Idle Time Threshold"
            min={10}
            max={300}
            value={idleThreshold}
            unit="s"
            readoutTag={`${(idleThreshold / 60).toFixed(1)}m`}
            onChange={(v) => update({ idle_threshold_seconds: String(v) })}
          />
        </div>
      </GlassCard>

      {/* System Behavior & Retention Section matching setting.html .behavior-grid */}
      <GlassCard
        className="p-[24px_28px]"
        aria-label="System behavior and retention"
      >
        <h2 className="text-[20px] font-bold text-[#f4f4f5] tracking-[-0.01em] m-0">
          System Behavior &amp; Retention
        </h2>
        <p className="mt-[8px] mb-[22px] text-[14px] text-[#a1a1aa] m-0">
          Desktop tray integration, system login autostart, and automatic data retention policies.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          <SwitchToggle
            label="Close to System Tray"
            checked={settings.close_to_tray === "true"}
            onChange={(v) => update({ close_to_tray: String(v) })}
          />

          <SwitchToggle
            label="Start Minimized"
            checked={settings.start_minimized === "true"}
            onChange={(v) => update({ start_minimized: String(v) })}
          />

          <SwitchToggle
            label="Launch on System Login"
            checked={settings.launch_on_login === "true"}
            onChange={async (v) => {
              await update({ launch_on_login: String(v) });
              if (window.electronAPI) {
                await window.electronAPI.setAutoStart(v);
              }
            }}
          />

          {/* Retention Dropdown Row matching setting.html */}
          <div className="bg-[#17171a] border border-white/[0.09] rounded-[12px] p-[16px_20px] flex items-center justify-between gap-4">
            <span className="text-[15px] font-semibold text-[#f4f4f5]">Data Retention Policy</span>
            <div className="relative shrink-0">
              <select
                aria-label="Data retention policy"
                value={settings.data_retention_days ?? "never"}
                onChange={(e) => update({ data_retention_days: e.target.value })}
                className="appearance-none text-[14px] font-semibold text-[#f4f4f5] bg-[#1f1f22] border border-white/[0.16] rounded-[9px] py-[9px] pl-[14px] pr-[34px] cursor-pointer outline-none focus:border-[#a855f7]"
              >
                <option value="never">Keep Forever</option>
                <option value="90">90 Days</option>
                <option value="30">30 Days</option>
                <option value="7">7 Days</option>
              </select>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Application Categorization Section matching setting.html .cat-table & .add-rule-box */}
      <GlassCard
        className="p-[24px_28px]"
        aria-label="Application categorization"
      >
        <div className="flex items-center gap-[12px] mb-[18px]">
          <span className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center shrink-0 bg-gradient-to-br from-[#7e22ce] to-[#a855f7] text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </span>
          <h2 className="text-[20px] font-bold text-[#f4f4f5] tracking-[-0.01em] m-0">
            Application Categorization
          </h2>
        </div>

        {/* Category Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse mt-[18px]">
            <thead>
              <tr className="border-b border-white/[0.09] text-left text-[13px] font-semibold text-[#a1a1aa]">
                <th className="px-[8px] pb-[12px]">Application</th>
                <th className="px-[8px] pb-[12px]">Category</th>
                <th className="px-[8px] pb-[12px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.app_name} className="border-b border-white/[0.09] last:border-none">
                  <td className="py-[12px] px-[8px]">
                    <div className="flex items-center gap-[12px]">
                      <AppIcon name={cat.app_name} />
                      <span className="text-[14px] font-medium text-[#f4f4f5]">{cat.app_name}</span>
                    </div>
                  </td>
                  <td className="py-[12px] px-[8px]">
                    <span className="inline-flex items-center px-[14px] py-[5px] rounded-full bg-[rgba(168,85,247,0.16)] text-[#c084fc] text-[13px] font-medium border border-[rgba(168,85,247,0.3)]">
                      {cat.category}
                    </span>
                  </td>
                  <td className="py-[12px] px-[8px]">
                    <div className="flex items-center justify-end gap-[14px]">
                      <button
                        type="button"
                        onClick={() => remove(cat.app_name)}
                        className="bg-none border-none text-[#a1a1aa] hover:text-[#fb7185] cursor-pointer p-[4px] transition-colors"
                        title={`Delete rule for ${cat.app_name}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Rule Box matching setting.html .add-rule-box */}
        <div className="mt-[20px] p-[18px_20px] bg-[#17171a] border border-white/[0.09] rounded-[12px]">
          <p className="text-[14px] font-semibold text-[#f4f4f5] m-0 mb-[12px]">Add Rule</p>
          <form
            className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-[12px]"
            onSubmit={async (e) => {
              e.preventDefault();
              if (newAppName.trim() && newCategory.trim()) {
                await add(newAppName.trim(), newCategory.trim());
                setNewAppName("");
                setNewCategory("");
              }
            }}
          >
            <input
              type="text"
              placeholder="Application process name"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              className="text-[14px] text-[#f4f4f5] bg-[#1f1f22] border border-white/[0.16] rounded-[9px] p-[11px_14px] outline-none focus:border-[#a855f7]"
              required
            />
            <input
              type="text"
              placeholder="Category label"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="text-[14px] text-[#f4f4f5] bg-[#1f1f22] border border-white/[0.16] rounded-[9px] p-[11px_14px] outline-none focus:border-[#a855f7]"
              required
            />
            <button
              type="submit"
              disabled={!newAppName.trim() || !newCategory.trim()}
              className="text-[14px] font-semibold text-white bg-[#a855f7] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed border-none rounded-[9px] p-[11px_20px] cursor-pointer whitespace-nowrap transition-all"
            >
              Add Rule
            </button>
          </form>
        </div>
      </GlassCard>

      {/* Local Data Export & Backup Section matching setting.html .export-panel */}
      <section
        className="p-[20px_24px] border border-white/[0.16] rounded-[14px] shadow-2xl relative flex flex-wrap items-center justify-between gap-[20px]"
        style={{ backgroundColor: "rgba(20, 20, 22, 0.92)", backdropFilter: "blur(14px)" }}
        aria-label="Local data export and backup"
      >
        <div className="flex items-center gap-[12px]">
          <span className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center shrink-0 bg-gradient-to-br from-[#7e22ce] to-[#a855f7] text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </span>
          <h2 className="text-[18px] font-bold text-[#f4f4f5] m-0">Local Data Export &amp; Backup</h2>
        </div>

        <div className="flex items-center gap-[10px]">
          <button
            type="button"
            onClick={() => handleExport("json")}
            className="font-mono text-[12px] font-semibold tracking-[0.02em] text-white bg-gradient-to-br from-[#7e22ce] to-[#a855f7] border-none rounded-[9px] p-[12px_18px] cursor-pointer hover:brightness-110 transition-all"
          >
            JSON
          </button>
          <button
            type="button"
            onClick={() => handleExport("csv")}
            className="font-mono text-[12px] font-semibold tracking-[0.02em] text-white bg-gradient-to-br from-[#7e22ce] to-[#a855f7] border-none rounded-[9px] p-[12px_18px] cursor-pointer hover:brightness-110 transition-all"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport(exportFormat)}
            className="text-[14px] font-semibold text-white bg-[#a855f7] hover:brightness-110 border-none rounded-[9px] p-[12px_22px] cursor-pointer transition-all whitespace-nowrap"
          >
            Export Database ({exportFormat.toUpperCase()})
          </button>
        </div>
        {exportStatus && (
          <div className="w-full text-right text-[13px] text-[#34d399] font-medium">
            {exportStatus}
          </div>
        )}
      </section>

      {/* Danger Zone Section matching setting.html .danger-panel */}
      <section
        className="p-[22px_26px] border border-[rgba(251,113,133,0.35)] rounded-[14px] shadow-2xl relative"
        style={{
          background: "linear-gradient(180deg, rgba(127, 29, 29, 0.28), rgba(127, 29, 29, 0.14))",
          backdropFilter: "blur(14px)",
        }}
        aria-label="Danger zone: irreversible data purge"
      >
        <div className="flex items-center gap-[10px] text-[#fb7185] text-[17px] font-bold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px]">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Danger Zone — Irreversible Data Purge
        </div>
        <p className="mt-[16px] mb-[4px] text-[15px] font-semibold text-[#f4f4f5] m-0">Irreversible Data Purge</p>
        <p className="mb-[18px] text-[14px] leading-[20px] text-[#a1a1aa] max-w-[640px] m-0">
          Permanently deletes all tracked application usage data from local storage. This action cannot be undone — export a backup first if you may need this data later.
        </p>

        <div className="flex flex-wrap gap-[12px]">
          <input
            type="text"
            placeholder='Type "DELETE" to enable clear button'
            value={clearConfirm}
            onChange={(e) => setClearConfirm(e.target.value)}
            className="flex-1 min-w-[220px] text-[14px] text-[#f4f4f5] bg-black/30 border border-[rgba(251,113,133,0.35)] rounded-[9px] p-[11px_14px] outline-none focus:border-[#fb7185] focus:shadow-[0_0_0_3px_rgba(251,113,133,0.18)]"
            autoComplete="off"
          />
          <button
            type="button"
            disabled={clearConfirm.trim() !== "DELETE"}
            onClick={handleClear}
            className={`text-[14px] font-semibold text-white rounded-[9px] p-[12px_24px] border-none whitespace-nowrap transition-all ${
              clearConfirm.trim() === "DELETE"
                ? "bg-gradient-to-br from-[#b91c1c] to-[#ef4444] cursor-pointer hover:brightness-110 opacity-100"
                : "bg-gradient-to-br from-[#b91c1c] to-[#ef4444] cursor-not-allowed opacity-50"
            }`}
          >
            Clear All Data
          </button>
        </div>
      </section>
    </div>
  );
}
