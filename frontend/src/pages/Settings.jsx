import { useState } from "react";
import { useSettings } from "../hooks/useSettings";
import { useCategories } from "../hooks/useCategories";
import { Slider } from "../components/ui/Slider";
import { Toggle } from "../components/ui/Toggle";
import {
  Sliders,
  Monitor,
  Tag,
  Database,
  Trash2,
  Plus,
  X,
  Check,
  Edit2,
  Download,
  ShieldAlert,
  Sparkles,
  Clock,
  HardDrive,
  Power,
  RotateCcw,
  Info,
  CheckCircle2,
  Calendar,
  Layers,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";

export function Settings() {
  const { settings, update } = useSettings();
  const { categories, update: updateCategory, add, remove } = useCategories();
  const [editingApp, setEditingApp] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [newAppName, setNewAppName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [clearConfirm, setClearConfirm] = useState("");
  const [exportFormat, setExportFormat] = useState("json");
  const [exportStatus, setExportStatus] = useState(null);

  if (!settings || Object.keys(settings).length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl glass-panel text-indigo-300 font-medium">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading preference engine...</span>
        </div>
      </div>
    );
  }

  const handleExport = async () => {
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.exportData(exportFormat);
      if (res && res.success) {
        setExportStatus(`Exported to ${res.path || "file"}`);
        setTimeout(() => setExportStatus(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClear = async () => {
    if (clearConfirm !== "DELETE" || !window.electronAPI) return;
    await window.electronAPI.clearAllData();
    setClearConfirm("");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fadeIn pb-16">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden p-6 rounded-2xl glass-panel border border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide mb-2">
              <Sparkles size={12} className="text-indigo-400 animate-pulse" />
              <span>ProcWatch Preferences</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Settings & Engine Control
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Configure background tracking intervals, system autostart options, application tags, and local SQLite data persistence.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              100% Offline Mode
            </span>
          </div>
        </div>a
      </div>

      {/* Section 1: Tracking Engine */}
      <section className="rounded-2xl glass-panel p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-800/80">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sliders size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Tracking Engine Calibration
            </h2>
            <p className="text-xs text-slate-400">
              Adjust how frequently active window polls are recorded and when idle detection triggers.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <Slider
              label="Polling Frequency"
              description="Interval between active window inspections (1s - 60s)"
              value={Number(settings.polling_interval_seconds ?? "5")}
              min={1}
              max={60}
              step={1}
              unit="s"
              badgeText={
                Number(settings.polling_interval_seconds ?? 5) <= 3
                  ? "High Accuracy"
                  : Number(settings.polling_interval_seconds ?? 5) <= 10
                  ? "Balanced"
                  : "Battery Saver"
              }
              onChange={(v) => update({ polling_interval_seconds: String(v) })}
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <Slider
              label="Idle Time Threshold"
              description="No input duration before session switches to Idle state (10s - 300s)"
              value={Number(settings.idle_threshold_seconds ?? "90")}
              min={10}
              max={300}
              step={5}
              unit="s"
              badgeText={`${Math.round(Number(settings.idle_threshold_seconds ?? 90) / 60 * 10) / 10}m`}
              onChange={(v) => update({ idle_threshold_seconds: String(v) })}
            />
          </div>
        </div>
      </section>

      {/* Section 2: General & System Integration */}
      <section className="rounded-2xl glass-panel p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-800/80">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Monitor size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              System Behavior & Retention
            </h2>
            <p className="text-xs text-slate-400">
              Desktop tray integration, system login autostart, and automatic data retention policies.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Toggle
            label="Close to System Tray"
            description="Closing the window minimizes to tray instead of exiting process"
            icon={Power}
            checked={settings.close_to_tray === "true"}
            onChange={(v) => update({ close_to_tray: String(v) })}
          />

          <Toggle
            label="Start Minimized"
            description="Launch silently into background on system startup"
            icon={Clock}
            checked={settings.start_minimized === "true"}
            onChange={(v) => update({ start_minimized: String(v) })}
          />

          <Toggle
            label="Launch on System Login"
            description="Auto-start ProcWatch background tracker when logging into Linux"
            icon={HardDrive}
            checked={settings.launch_on_login === "true"}
            onChange={async (v) => {
              await update({ launch_on_login: String(v) });
              if (window.electronAPI) {
                await window.electronAPI.setAutoStart(v);
              }
            }}
          />

          {/* Retention Dropdown Card */}
          <div className="p-3.5 rounded-xl glass-panel-interactive flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Calendar size={16} />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-200">
                  Data Retention Policy
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automatically purge log records older than chosen limit
                </p>
              </div>
            </div>
            <select
              value={settings.data_retention_days ?? "never"}
              onChange={(e) => update({ data_retention_days: e.target.value })}
              className="bg-slate-900 border border-slate-700/80 text-indigo-300 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:border-indigo-500 shadow-inner cursor-pointer"
            >
              <option value="never">Keep Forever</option>
              <option value="30">30 Days</option>
              <option value="60">60 Days</option>
              <option value="90">90 Days</option>
            </select>
          </div>
        </div>
      </section>

      {/* Section 3: Categories & Rule Engine */}
      <section className="rounded-2xl glass-panel p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Application Categorization
              </h2>
              <p className="text-xs text-slate-400">
                Map application binary names to categories for grouped analytics in weekly & monthly charts.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
            {categories.length} Rule{categories.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-3 mb-6 max-h-[320px] overflow-y-auto pr-1">
          {categories.map((cat) => (
            <div
              key={cat.app_name}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/80 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-indigo-400 uppercase border border-slate-700/50">
                  {cat.app_name.slice(0, 2)}
                </div>
                <span className="text-sm font-semibold text-slate-200">
                  {cat.app_name}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {editingApp === cat.app_name ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="bg-slate-950 border border-indigo-500 text-white text-xs font-medium rounded-lg px-3 py-1.5 outline-none w-36 shadow-inner"
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        await updateCategory(cat.app_name, editValue);
                        setEditingApp(null);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-md"
                    >
                      <Check size={14} /> Save
                    </button>
                    <button
                      onClick={() => setEditingApp(null)}
                      className="px-2 py-1.5 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-medium">
                      {cat.category}
                    </span>
                    <button
                      onClick={() => {
                        setEditingApp(cat.app_name);
                        setEditValue(cat.category);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => remove(cat.app_name)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove Mapping"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add New Category Mapping */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              placeholder="Application process name (e.g. code, firefox)"
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500/80 transition-colors placeholder:text-slate-500"
            />
          </div>
          <div className="relative flex-1 w-full">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category label (e.g. Development, Media)"
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500/80 transition-colors placeholder:text-slate-500"
            />
          </div>
          <button
            onClick={async () => {
              if (newAppName.trim() && newCategory.trim()) {
                await add(newAppName.trim(), newCategory.trim());
                setNewAppName("");
                setNewCategory("");
              }
            }}
            disabled={!newAppName.trim() || !newCategory.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all shadow-md shrink-0"
          >
            <Plus size={16} />
            <span>Add Rule</span>
          </button>
        </div>
      </section>

      {/* Section 4: Data Management & Export */}
      <section className="rounded-2xl glass-panel p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-800/80">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Local Data Export & Backup
            </h2>
            <p className="text-xs text-slate-400">
              Export all tracking session records and category rules to local JSON or CSV file without network calls.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setExportFormat("json")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  exportFormat === "json"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileJson size={14} /> JSON
              </button>
              <button
                onClick={() => setExportFormat("csv")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  exportFormat === "csv"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileSpreadsheet size={14} /> CSV
              </button>
            </div>
            {exportStatus && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium animate-fadeIn">
                <CheckCircle2 size={14} /> {exportStatus}
              </span>
            )}
          </div>

          <button
            onClick={handleExport}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/50"
          >
            <Download size={16} />
            <span>Export Database ({exportFormat.toUpperCase()})</span>
          </button>
        </div>
      </section>

      {/* Section 5: Danger Zone */}
      <section className="rounded-2xl glass-danger-panel p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-rose-500/20">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-rose-200 tracking-wide">
              Danger Zone — Irreversible Data Purge
            </h2>
            <p className="text-xs text-rose-300/70">
              Clear all tracked active sessions, history logs, and user configuration from your local SQLite database.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-rose-950/30 border border-rose-500/20">
          <div className="w-full sm:w-auto flex-1">
            <input
              value={clearConfirm}
              onChange={(e) => setClearConfirm(e.target.value)}
              placeholder='Type "DELETE" to enable clear button'
              className="w-full bg-slate-950 border border-rose-900/60 text-slate-200 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-rose-500/80 transition-colors placeholder:text-rose-900/80 font-mono"
            />
          </div>

          <button
            onClick={handleClear}
            disabled={clearConfirm !== "DELETE"}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-rose-950/60 shrink-0"
          >
            <Trash2 size={16} />
            <span>Clear All Data</span>
          </button>
        </div>
      </section>
    </div>
  );
}
