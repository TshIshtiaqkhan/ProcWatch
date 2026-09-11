import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Trash2, Database, Sliders, Shield, Tag, Download, Target } from "lucide-react";
import { useSettings } from "../hooks/useSettings";
import { useCategories } from "../hooks/useCategories";
import { AppIcon } from "../components/ui/AppIcon";
import { LoadingState } from "../components/ui/LoadingState";
import { GlassCard } from "../components/ui/GlassCard";

const SliderCard = ({ label, min, max, value, onChange, readoutTag, unit }) => {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const pct = Math.round(((localVal - min) / (max - min)) * 100);

  return (
    <div className="bg-[#17171a] border border-[#27272a] rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-xs font-semibold text-[#f4f4f5]">{label}</span>
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="text-[11px] text-[#71717a] font-mono">{readoutTag}</span>
          <span className="font-mono text-sm font-bold text-[#31afd4]">
            {localVal}{unit}
          </span>
        </div>
      </div>

      <div className="relative h-1.5 rounded-full bg-[#1f1f22]">
        <div
          className="absolute top-0 left-0 bottom-0 rounded-full bg-gradient-to-r from-[#004fff] to-[#31afd4] shadow-[0_0_8px_rgba(0,79,255,0.4)]"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.5),0_0_0_3px_rgba(0,79,255,0.35)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={localVal}
          onChange={(e) => setLocalVal(Number(e.target.value))}
          onPointerUp={() => onChange(localVal)}
          onKeyUp={() => onChange(localVal)}
          className="absolute -top-2 left-0 w-full h-5 opacity-0 cursor-pointer m-0"
        />
      </div>

      <div className="flex justify-between font-mono text-[11px] text-[#71717a]">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
};

const SwitchToggle = ({ label, description, checked, onChange }) => (
  <div className="bg-[#17171a] border border-[#27272a] rounded-xl p-4 flex items-center justify-between gap-4">
    <div>
      <span className="text-xs font-semibold text-[#f4f4f5] block">{label}</span>
      {description && <span className="text-[11px] text-[#71717a] block mt-0.5">{description}</span>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 shrink-0 rounded-full transition-colors duration-200 cursor-pointer border-none ${
        checked
          ? "bg-[#004fff] shadow-[0_0_12px_rgba(0,79,255,0.4)] border border-[#004fff]/60"
          : "bg-[#3f3f46]"
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

export function Settings() {
  const { settings, update } = useSettings();
  const { categories, add, remove, setDistracting } = useCategories();
  const [newAppName, setNewAppName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newIsDistracting, setNewIsDistracting] = useState(false);
  const [clearConfirm, setClearConfirm] = useState("");
  const [exportFormat, setExportFormat] = useState("json");
  const [exportStatus, setExportStatus] = useState(null);
  const [bannerNotice, setBannerNotice] = useState(null);

  if (!settings || Object.keys(settings).length === 0) {
    return <LoadingState message="Loading preference engine..." />;
  }

  const pollInterval = Number(settings.polling_interval_seconds ?? 5);
  const idleThreshold = Number(settings.idle_threshold_seconds ?? 90);
  const focusDuration = Number(settings.focus_session_duration_minutes ?? 25);
  const focusBreak = Number(settings.focus_session_break_minutes ?? 5);

  const showNotification = (msg, isError = false) => {
    setBannerNotice({ text: msg, isError });
    setTimeout(() => setBannerNotice(null), 4500);
  };

  const handleExport = async (format) => {
    const fmt = format || exportFormat;
    setExportFormat(fmt);
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.exportData(fmt);
      if (res && res.success && !res.data?.canceled) {
        showNotification(`Export complete: ${res.data?.path || "File saved"}`);
      }
    } catch (e) {
      showNotification(`Export failed: ${e.message}`, true);
    }
  };

  const handleClear = async () => {
    if (clearConfirm.trim() !== "DELETE" || !window.electronAPI) return;
    try {
      const res = await window.electronAPI.clearAllData(clearConfirm.trim());
      if (res && res.success) {
        setClearConfirm("");
        showNotification("All tracking data has been permanently cleared from SQLite.");
      } else {
        showNotification(res?.error?.message || "Failed to clear data.", true);
      }
    } catch (err) {
      showNotification(err.message || "Failed to clear data.", true);
    }
  };

  return (
    <div className="p-7 max-w-[1400px] mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Toast Feedback Notification Banner */}
      {bannerNotice && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium backdrop-blur-md shadow-glass animate-fadeIn ${
            bannerNotice.isError
              ? "bg-[#902d41]/30 border-[#fb7185]/40 text-[#fb7185]"
              : "bg-[#004fff]/15 border-[#004fff]/30 text-[#31afd4]"
          }`}
        >
          {bannerNotice.isError ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{bannerNotice.text}</span>
        </div>
      )}

      {/* Hero Panel */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#17171a] border border-[#27272a] text-xs font-mono text-[#a1a1aa]">
            Preferences &amp; Engine
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-white tracking-tight leading-none">
          Settings &amp; Engine Control
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-[#a1a1aa] max-w-2xl">
          Calibrate active window detection intervals, customize application categorization rules, export data backups, and configure system autostart.
        </p>
      </GlassCard>

      {/* Tracking Engine Calibration */}
      <GlassCard className="p-6 space-y-4" aria-label="Tracking engine calibration">
        <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
          <Sliders size={16} className="text-[#31afd4]" />
          <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
            Tracking Engine Calibration
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Focus & Pomodoro Settings */}
      <GlassCard className="p-6 space-y-4" aria-label="Focus and Pomodoro settings">
        <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
          <Target size={16} className="text-[#31afd4]" />
          <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
            Focus &amp; Pomodoro Calibration
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SliderCard
            label="Default Focus Duration"
            min={5}
            max={90}
            value={focusDuration}
            unit="m"
            readoutTag={`${focusDuration} min`}
            onChange={(v) => update({ focus_session_duration_minutes: String(v) })}
          />

          <SliderCard
            label="Short Break Duration"
            min={1}
            max={30}
            value={focusBreak}
            unit="m"
            readoutTag={`${focusBreak} min`}
            onChange={(v) => update({ focus_session_break_minutes: String(v) })}
          />
        </div>
      </GlassCard>

      {/* System Behavior & Retention */}
      <GlassCard className="p-6 space-y-4" aria-label="System behavior and retention">
        <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
          <Shield size={16} className="text-[#31afd4]" />
          <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
            System Behavior &amp; Retention
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SwitchToggle
            label="Close to System Tray"
            description="Keep background tracking alive when window closes"
            checked={settings.close_to_tray === "true"}
            onChange={(v) => update({ close_to_tray: String(v) })}
          />

          <SwitchToggle
            label="Start Minimized"
            description="Launch into system tray without opening window"
            checked={settings.start_minimized === "true"}
            onChange={(v) => update({ start_minimized: String(v) })}
          />

          <SwitchToggle
            label="Launch on System Login"
            description="Automatically start ProcWatch when desktop starts"
            checked={settings.launch_on_login === "true"}
            onChange={async (v) => {
              await update({ launch_on_login: String(v) });
              if (window.electronAPI) {
                await window.electronAPI.setAutoStart(v);
              }
            }}
          />

          <div className="bg-[#17171a] border border-[#27272a] rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-[#f4f4f5] block">Data Retention Policy</span>
              <span className="text-[11px] text-[#71717a] block mt-0.5">Purge older sessions daily</span>
            </div>
            <select
              aria-label="Data retention policy"
              value={settings.data_retention_days ?? "never"}
              onChange={(e) => update({ data_retention_days: e.target.value })}
              className="text-xs font-semibold text-[#f4f4f5] bg-[#1f1f22] border border-[#27272a] rounded-lg py-1.5 px-3 cursor-pointer outline-none focus:border-[#004fff] transition-all font-mono"
            >
              <option value="never">Keep Forever</option>
              <option value="90">90 Days</option>
              <option value="30">30 Days</option>
              <option value="7">7 Days</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Application Categorization */}
      <GlassCard className="p-6 space-y-4" aria-label="Application categorization">
        <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
          <Tag size={16} className="text-[#31afd4]" />
          <h2 className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">
            Application Categorization
          </h2>
        </div>

        {/* Category Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs font-semibold text-[#a1a1aa]">
                <th className="px-2 pb-2">Application</th>
                <th className="px-2 pb-2">Category</th>
                <th className="px-2 pb-2 text-center">Focus Mode</th>
                <th className="px-2 pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.app_name} className="border-b border-white/[0.04] last:border-none">
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-3">
                      <AppIcon name={cat.app_name} size={18} />
                      <span className="text-xs font-medium text-[#f4f4f5]">{cat.app_name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#004fff]/15 text-[#31afd4] text-xs font-mono border border-[#004fff]/30">
                      {cat.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => setDistracting(cat.app_name, !cat.is_distracting)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border cursor-pointer ${
                        cat.is_distracting
                          ? "bg-[#ff007f]/15 text-[#ff007f] border-[#ff007f]/40 shadow-[0_0_8px_rgba(255,0,127,0.25)]"
                          : "bg-white/[0.04] text-[#71717a] border-white/[0.08] hover:text-[#a1a1aa]"
                      }`}
                      title={cat.is_distracting ? "Marked as distracting during Focus sessions" : "Click to mark as distracting"}
                    >
                      {cat.is_distracting ? "Distracting" : "Allowed"}
                    </button>
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => remove(cat.app_name)}
                      className="p-1 rounded text-[#71717a] hover:text-[#fb7185] hover:bg-[#902d41]/20 transition-all cursor-pointer"
                      title={`Delete rule for ${cat.app_name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Rule Box */}
        <div className="p-4 bg-[#17171a] border border-[#27272a] rounded-xl space-y-3">
          <p className="text-xs font-semibold text-[#f4f4f5]">Add New Category Rule</p>
          <form
            className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-center"
            onSubmit={async (e) => {
              e.preventDefault();
              if (newAppName.trim() && newCategory.trim()) {
                await add(newAppName.trim(), newCategory.trim(), newIsDistracting);
                setNewAppName("");
                setNewCategory("");
                setNewIsDistracting(false);
              }
            }}
          >
            <input
              type="text"
              placeholder="Application name (e.g. Code, Chrome)"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              className="text-xs text-[#f4f4f5] bg-[#1f1f22] border border-[#27272a] rounded-lg px-3 py-2 outline-none focus:border-[#004fff] transition-all"
              required
            />
            <input
              type="text"
              placeholder="Category label (e.g. Work, Media)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="text-xs text-[#f4f4f5] bg-[#1f1f22] border border-[#27272a] rounded-lg px-3 py-2 outline-none focus:border-[#004fff] transition-all"
              required
            />
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#a1a1aa] whitespace-nowrap select-none">
              <input
                type="checkbox"
                checked={newIsDistracting}
                onChange={(e) => setNewIsDistracting(e.target.checked)}
                className="accent-[#ff007f] rounded cursor-pointer"
              />
              <span>Distracting</span>
            </label>
            <button
              type="submit"
              disabled={!newAppName.trim() || !newCategory.trim()}
              className="text-xs font-semibold text-white bg-[#004fff] hover:bg-[#31afd4] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-4 py-2 cursor-pointer whitespace-nowrap shadow-[0_0_15px_rgba(0,79,255,0.35)] transition-all"
            >
              Add Rule
            </button>
          </form>
        </div>
      </GlassCard>

      {/* Local Data Export */}
      <GlassCard className="p-6 flex flex-wrap items-center justify-between gap-4" aria-label="Local data export">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#004fff]/15 border border-[#004fff]/30 flex items-center justify-center text-[#31afd4] shrink-0">
            <Download size={16} />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#f4f4f5] uppercase tracking-wider">Local Data Export &amp; Backup</h2>
            <p className="text-xs text-[#71717a] mt-0.5">Stream entire sessions database to JSON or CSV file</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleExport("json")}
            className="text-xs font-mono font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg px-3 py-2 cursor-pointer transition-all"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => handleExport("csv")}
            className="text-xs font-mono font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg px-3 py-2 cursor-pointer transition-all"
          >
            Export CSV
          </button>
        </div>
      </GlassCard>

      {/* Danger Zone */}
      <section
        className="p-6 border border-[#fb7185]/30 rounded-2xl relative shadow-2xl space-y-3"
        style={{
          background: "linear-gradient(180deg, rgba(144, 45, 65, 0.25), rgba(144, 45, 65, 0.08))",
          backdropFilter: "blur(14px)",
        }}
        aria-label="Danger zone"
      >
        <div className="flex items-center gap-2 text-[#fb7185] text-xs font-bold uppercase tracking-wider">
          <AlertTriangle size={16} />
          Danger Zone — Irreversible Data Purge
        </div>
        <p className="text-xs text-[#a1a1aa] max-w-2xl leading-relaxed">
          Permanently deletes all recorded application sessions from local SQLite storage. This action cannot be undone.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <input
            type="text"
            placeholder='Type "DELETE" to confirm'
            value={clearConfirm}
            onChange={(e) => setClearConfirm(e.target.value)}
            className="flex-1 min-w-[200px] text-xs text-[#f4f4f5] bg-black/40 border border-[#fb7185]/30 rounded-lg px-3 py-2 outline-none focus:border-[#fb7185] focus:shadow-[0_0_12px_rgba(251,113,133,0.25)] font-mono transition-all"
            autoComplete="off"
          />
          <button
            type="button"
            disabled={clearConfirm.trim() !== "DELETE"}
            onClick={handleClear}
            className={`text-xs font-semibold text-white rounded-lg px-4 py-2 transition-all whitespace-nowrap ${
              clearConfirm.trim() === "DELETE"
                ? "bg-gradient-to-br from-[#b91c1c] to-[#ef4444] shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer hover:brightness-110"
                : "bg-white/[0.05] text-[#71717a] border border-white/[0.08] cursor-not-allowed"
            }`}
          >
            Clear All Data
          </button>
        </div>
      </section>
    </div>
  );
}
