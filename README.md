# Screen Time Tracker

A fully offline desktop app for Linux (X11) that tracks how much time you spend in each application, stores everything locally, and presents it through a visual dashboard. Built with Electron and React.

- **Version:** 1.0
- **Platform target:** Linux (X11), Desktop, Fully Offline
- **Status:** Draft

---

## Quick Start

### Features

- Track active window time in real-time
- View daily, weekly, and monthly usage summaries
- Interactive charts and statistics per application
- Works completely offline — no data leaves your machine
- Lightweight SQLite database for local storage

### Tech Stack

- **Desktop shell:** Electron (main process in `backend/`)
- **Frontend:** React + Vite + Tailwind CSS + Recharts
- **Local database:** better-sqlite3
- **Window detection:** active-win

### Prerequisites

- Node.js 18+
- Linux (x64)
- npm

### Install dependencies

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Development

```bash
npm run dev
```

This starts the Electron app with the frontend dev server.

### Build the frontend

```bash
npm run build
```

### Package the app

```bash
npm run pack    # Build into release/ without full installer
npm run dist    # Build AppImage and deb packages
```

### Project Structure

```
.
├── backend/           # Electron main process and tracker engine
│   └── src/
├── frontend/          # React user interface
│   └── src/
├── package.json       # Root workspace scripts and Electron Builder config
└── README.md
```

---

## 1. Overview

### 1.1 Summary
A fully offline desktop application for Linux that tracks how much time a user spends in each application/window, stores this data locally, and presents it through a visual dashboard (daily, weekly, monthly views). No internet connection, no cloud sync, no telemetry, no external accounts.

### 1.2 Problem Statement
Users want visibility into their computer usage habits (which apps/websites consume their time) without sending any data off their machine. Existing tools (RescueTime, ActivityWatch cloud features, etc.) often require accounts or send data externally. This app solves that with a 100% local-first solution.

### 1.3 Goals
- Track active application/window usage automatically in the background
- Distinguish active time from idle time
- Store all data locally in SQLite — zero network calls
- Present usage data via clear, simple charts and breakdowns
- Run persistently via system tray with minimal resource usage
- Be fully functional with no internet connection at any point (install, run, update)

### 1.4 Non-Goals (out of scope for v1)
- Cross-device sync
- Cloud backup
- Mobile companion app
- Browser tab-level tracking (only window-level, not per-tab; can be a v2 stretch goal via browser extension)
- Wayland support (X11 only for v1 — documented as known limitation)
- Team/multi-user reporting or admin dashboards
- Website blocking / productivity enforcement features (v1 is observation-only)
- Windows/macOS builds

### 1.5 Target User / Persona
- Linux desktop users (X11 session) who want self-awareness of screen habits
- Developers, freelancers, students who want to audit their own focus time
- Privacy-conscious users who refuse cloud-based tracking tools

---

## 2. Success Metrics

- App runs continuously for 7+ days without crash or memory leak
- Tracking data captured with <2% gap/error rate (missed polling intervals)
- Dashboard loads and renders in <500ms for a 30-day dataset
- CPU usage of background tracker stays under 1% average on idle system
- Memory footprint under 150MB for Electron main + renderer combined

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────┐
│              Electron App                     │
│                                                 │
│  ┌───────────────┐        ┌─────────────────┐ │
│  │  Main Process │  IPC   │ Renderer Process│ │
│  │  (Node.js)    │◄──────►│  (React + TS)   │ │
│  │               │        │                 │ │
│  │ - Tracker     │        │ - Dashboard UI  │ │
│  │ - DB Layer    │        │ - Charts        │ │
│  │ - Tray Icon   │        │ - Settings Page │ │
│  │ - IPC Handlers│        │                 │ │
│  └─────┬─────────┘        └─────────────────┘ │
│        │                                       │
│        ▼                                       │
│  ┌───────────────┐                             │
│  │  SQLite DB    │                             │
│  │  (local file) │                             │
│  └───────────────┘                             │
└─────────────────────────────────────────────┘
          │
          ▼
   xdotool / wmctrl / xprop (X11 system calls via active-win)
```

### 3.2 Process Responsibilities

**Main process (Node.js, Electron):**
- Owns the SQLite database connection (single writer, avoids concurrency issues)
- Runs the polling loop (active window detection)
- Runs idle detection via Electron's `powerMonitor` API
- Manages system tray icon, context menu, app lifecycle
- Exposes IPC handlers for the renderer to query data (read-only from renderer side)
- Handles app auto-start on login (optional setting)

**Renderer process (React + TypeScript):**
- Pure UI layer — no direct file system or DB access (security best practice, contextIsolation enabled)
- Requests data via `window.electronAPI.getUsage(...)` (exposed through `contextBridge`)
- Renders charts, tables, settings screen

### 3.3 Security Model
- `contextIsolation: true`
- `nodeIntegration: false` in renderer
- `sandbox: true` where possible
- Preload script exposes a strict, typed API surface (`preload.ts`) — no raw IPC channel names exposed to renderer directly
- No remote content ever loaded (`webSecurity` stays enabled, no `<webview>` tags pointing externally)

---

## 4. Tech Stack (exact versions to pin at project init)

| Layer | Technology | Notes |
|---|---|---|
| Shell | Electron (latest stable) | Pure JS/TS, no Rust |
| Language | TypeScript | Strict mode enabled across main + renderer |
| UI Framework | React 18+ | Functional components + hooks only |
| Bundler | Vite (electron-vite) | Fast dev reload for both processes |
| Local DB | SQLite via `better-sqlite3` | Synchronous, fast, no async overhead for local writes |
| Active window detection | `active-win` (npm) | Wraps `wmctrl`/`xdotool`/`xprop` on Linux |
| Idle detection | Electron `powerMonitor.getSystemIdleTime()` | Built-in, cross-desktop-environment safe |
| Charts | `recharts` | Matches existing React familiarity |
| Styling | Tailwind CSS | Fast iteration, utility classes |
| Tray icon | Electron `Tray` API | Built-in |
| Packaging | `electron-builder` | Produces `.AppImage`, `.deb` |
| State management (renderer) | React Context + hooks | No Redux needed for this scope |
| Testing | Vitest (unit), Playwright (E2E, optional v1.1) | |

### 4.1 System Dependencies (Linux, must be present on user's machine)
- `xdotool` — for active window title/PID detection
- `wmctrl` — fallback/alternate window listing
- `xprop` — window property inspection
- X11 session (`$XDG_SESSION_TYPE` must be `x11`)

**Note:** these are typically pre-installed on most Linux desktop distros, but the app should check for their presence on first launch and show a clear error/instructions if missing (see section 7.6).

---

## 5. Functional Requirements

### 5.1 Tracking Engine

**FR-1: Active window polling**
- Poll the currently focused window every **5 seconds** (configurable in settings, range 1–60s)
- Capture: `app_name` (process/executable name), `window_title` (full title string), `timestamp` (ISO 8601, local time)
- Each poll either extends the current "session" row (if same app+title as last poll) or closes the previous session and opens a new one

**FR-2: Idle detection**
- Check system idle time every poll cycle via `powerMonitor.getSystemIdleTime()`
- If idle time exceeds threshold (default **90 seconds**, configurable), mark the user as idle
- While idle: stop accumulating time toward the active app; log a separate "Idle" session block
- When activity resumes: close idle session, resume normal tracking

**FR-3: Session aggregation**
- Raw polling data is stored as discrete "session" rows: `(app_name, window_title, start_time, end_time)`
- A background job (or on-write trigger) merges consecutive polls of the same app+title into a single session row rather than storing every 5-second tick — this keeps the DB small
- Daily aggregation view: sum of all session durations grouped by `app_name` per calendar day (local timezone)

**FR-4: App categorization (v1 basic)**
- Maintain a simple local mapping table `app_categories(app_name, category)` with sane defaults (e.g., `code` → "Development", `firefox`/`chromium` → "Browser", `slack`/`discord` → "Communication", unmatched → "Uncategorized")
- User can edit categories manually in Settings
- Categorization is used for the "time by category" pie chart

**FR-5: Pause/resume tracking**
- Tray menu option: "Pause Tracking" / "Resume Tracking"
- While paused, no polling occurs and no data is written
- Visual indicator (tray icon changes color/badge) when paused

**FR-6: Data retention**
- Default: keep all data indefinitely (it's local and small — see storage estimate in 6.4)
- Settings option: "Auto-delete data older than [30/60/90/never] days"

### 5.2 Dashboard / UI

**FR-7: Today view (default screen on open)**
- Total active time today (large number, top of screen)
- Total idle time today
- Bar chart: time spent per app today, sorted descending
- List view below chart: app icon (if available) + name + duration + percentage of total

**FR-8: Weekly view**
- Stacked bar chart: one bar per day (last 7 days), segments colored by app or category
- Toggle: "By App" vs "By Category"

**FR-9: Monthly / custom range view**
- Calendar heatmap (GitHub-contributions-style) showing total active time per day, color intensity = more time
- Date range picker for custom start/end queries

**FR-10: App detail drill-down**
- Click any app in a chart/list → detail page showing:
  - Time spent per day for that app over selectable range
  - List of window titles seen for that app (useful for browser: shows page titles) with time per title

**FR-11: Settings screen**
- Polling interval slider
- Idle threshold slider
- Category management (add/edit/remove app→category mappings)
- Data retention policy dropdown
- Launch on system login toggle
- Start minimized to tray toggle
- Export data button (see FR-12)
- Clear all data button (with confirmation dialog + typed "DELETE" confirmation)

**FR-12: Data export**
- Button to export all data as CSV or JSON to a user-chosen local path (via native file save dialog)
- No network calls involved — pure local file write

**FR-13: System tray**
- Icon always present while app is running
- Left-click: open/focus main window
- Right-click context menu: "Open Dashboard", "Pause/Resume Tracking", "Today's summary" (quick tooltip or submenu with top 3 apps), "Quit"
- Closing the main window (X button) minimizes to tray by default, doesn't quit the process (configurable)

### 5.3 Application Lifecycle

**FR-14: First-run experience**
- On first launch: check for `xdotool`/`wmctrl` presence → if missing, show install instructions per common distros (apt/dnf/pacman commands)
- Check `$XDG_SESSION_TYPE` → if Wayland, show a warning banner: "Active window tracking may not work reliably under Wayland. See docs for workarounds." but still allow the app to run (idle detection still works via powerMonitor regardless)
- Brief onboarding: 2–3 screen walkthrough (what the app does, where data is stored, privacy note: "100% offline, nothing leaves your machine")

**FR-15: Auto-start on login (optional)**
- Uses Electron's `app.setLoginItemSettings()` equivalent for Linux (writes a `.desktop` autostart entry to `~/.config/autostart/`)
- Toggle in settings, off by default (user opts in)

---

## 6. Data Model

### 6.1 SQLite Schema

```sql
-- Raw/merged session records
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_name TEXT NOT NULL,
    window_title TEXT,
    start_time TEXT NOT NULL,   -- ISO 8601
    end_time TEXT NOT NULL,     -- ISO 8601
    duration_seconds INTEGER NOT NULL,
    is_idle INTEGER NOT NULL DEFAULT 0,  -- 0 = active, 1 = idle block
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_app_name ON sessions(app_name);

-- App -> category mapping
CREATE TABLE app_categories (
    app_name TEXT PRIMARY KEY,
    category TEXT NOT NULL DEFAULT 'Uncategorized'
);

-- User settings (key-value)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Default settings seeded on first run:
-- polling_interval_seconds = '5'
-- idle_threshold_seconds = '90'
-- data_retention_days = 'never'
-- launch_on_login = 'false'
-- start_minimized = 'true'
-- close_to_tray = 'true'
```

### 6.2 IPC Contract (Main ⇄ Renderer)

| Channel | Direction | Payload | Returns |
|---|---|---|---|
| `usage:getToday` | Renderer→Main | `{}` | `{ appName, seconds }[]` |
| `usage:getRange` | Renderer→Main | `{ startDate, endDate }` | `{ date, appName, seconds }[]` |
| `usage:getAppDetail` | Renderer→Main | `{ appName, startDate, endDate }` | `{ date, seconds, titles: {title, seconds}[] }[]` |
| `tracking:pause` | Renderer→Main | `{}` | `{ success: boolean }` |
| `tracking:resume` | Renderer→Main | `{}` | `{ success: boolean }` |
| `tracking:status` | Renderer→Main | `{}` | `{ isPaused: boolean }` |
| `settings:get` | Renderer→Main | `{}` | `Settings object` |
| `settings:update` | Renderer→Main | `Partial<Settings>` | `{ success: boolean }` |
| `data:export` | Renderer→Main | `{ format: 'csv'|'json' }` | `{ success: boolean, path?: string }` |
| `data:clearAll` | Renderer→Main | `{}` | `{ success: boolean }` |
| `categories:list` | Renderer→Main | `{}` | `{ appName, category }[]` |
| `categories:update` | Renderer→Main | `{ appName, category }` | `{ success: boolean }` |

### 6.3 Session Merge Logic (pseudocode)

```
on each poll tick:
  currentWindow = activeWin()
  if idleTime > idleThreshold:
      if lastSession.is_idle == false or null:
          closeSession(lastSession, now)
          lastSession = openSession(app_name="Idle", is_idle=true, start=now)
      // else: still idle, do nothing, extend on close
  else:
      if lastSession is null OR lastSession.app_name != currentWindow.app
         OR lastSession.window_title != currentWindow.title
         OR lastSession.is_idle == true:
          closeSession(lastSession, now)  // sets end_time + duration
          lastSession = openSession(app_name=currentWindow.app,
                                     window_title=currentWindow.title,
                                     start=now, is_idle=false)
      // else: same window as before, do nothing (session continues)
```

### 6.4 Storage Estimate
- Assuming ~50 session-switches/day average user, ~200 bytes/row → ~10KB/day → ~3.6MB/year. Negligible storage footprint even over years of use.

---

## 7. Non-Functional Requirements

### 7.1 Performance
- Polling loop must not block the main process event loop — use `setInterval` with lightweight async calls
- DB writes are synchronous (`better-sqlite3` is sync by design) but fast enough (<5ms per write) to not cause jank
- Renderer queries should use indexed date-range lookups, never full table scans

### 7.2 Reliability
- If `active-win` throws (e.g., no window focused, or X11 call fails), catch the error, log it, and skip that poll cycle gracefully — never crash the tracker loop
- Wrap all DB writes in try/catch; log failures to a local log file (`~/.config/screen-time-app/logs/`)
- Handle system sleep/wake: pause tracking during suspend, resume cleanly on wake (Electron `powerMonitor` `suspend`/`resume` events)

### 7.3 Privacy & Offline Guarantee
- No network permissions requested; app should function correctly with network interfaces fully disabled
- No analytics, crash reporting, or telemetry SDKs (no Sentry, no Google Analytics, etc.)
- All data stored in `~/.config/screen-time-app/data.sqlite` (or `$XDG_DATA_HOME` equivalent) — user owns and controls this file entirely
- Explicit privacy statement in-app and in README

### 7.4 Resource Usage
- Background CPU: <1% average when idle
- Memory: <150MB combined (main + renderer)
- No GPU acceleration required for charts at this data scale

### 7.5 Accessibility
- Keyboard navigable settings screen
- Sufficient color contrast in charts (WCAG AA minimum)
- Chart data also available in a plain table view as an accessible alternative

### 7.6 Error Handling / Edge Cases
- Missing `xdotool`/`wmctrl`: show blocking dialog on first run with copy-paste install command for the detected distro (best-effort detection via `/etc/os-release`)
- Wayland session detected: show non-blocking warning banner, app still launches
- Corrupted DB file on launch: attempt SQLite integrity check; if failed, prompt user to back up and reset DB rather than silently failing
- Multiple app instances: use Electron's `app.requestSingleInstanceLock()` to prevent duplicate tracking processes writing to the same DB concurrently
- Clock changes (e.g., timezone change, NTP correction): store all timestamps in UTC internally, convert to local time only at display layer, to avoid corrupting duration math

---

## 8. UI/UX Notes

### 8.1 Screens List
1. Onboarding (3 steps, first run only)
2. Today Dashboard (default/home screen)
3. Weekly View
4. Monthly/Custom Range View
5. App Detail Drill-down
6. Settings
7. Tray context menu (not a full screen, but a UI surface)

### 8.2 Visual Style
- Dark mode default (screen-time apps are often checked at end of day; dark mode reduces eye strain), light mode toggle available
- Minimal, data-forward design — charts and numbers are the hero content, minimal chrome
- Color palette: distinct, colorblind-safe palette for per-app chart segments (avoid relying on red/green alone)

### 8.3 Empty States
- First-run dashboard before any data collected: friendly message "Tracking started! Check back in a bit to see your usage." with a subtle loading/pulse animation on the tray icon indicator

---

## 9. Packaging & Distribution

### 9.1 Build Targets
- `.AppImage` (universal, no install required — good default for "fully offline" distribution philosophy)
- `.deb` (Debian/Ubuntu-based)
- Optional: `.rpm`, AUR package (community-contributed, v1.1+)

### 9.2 electron-builder Config Notes
- `asar: true` for packaging renderer/main code
- Ensure `better-sqlite3` native module is rebuilt for target Electron ABI during CI (`electron-rebuild`)
- Bundle no auto-updater in v1 (auto-update would require a network check-in — conflicts with "fully offline" philosophy; if added later, must be fully opt-in and clearly disclosed)

### 9.3 App Metadata
- App name: `Screen Time Tracker` (placeholder — customize to your domain/brand)
- `.desktop` file with correct `Categories=Utility;` for Linux app menu integration
- Icon set: 16/32/64/128/256/512px PNG + SVG

---

## 10. Milestones / Roadmap

**Milestone 1 — Core Tracking (Week 1–2)**
- Electron + TS scaffold, `better-sqlite3` setup, schema migration
- Polling loop + `active-win` integration + idle detection
- Session merge logic, manual DB inspection to verify correctness

**Milestone 2 — Dashboard MVP (Week 2–3)**
- Today view with bar chart + list
- IPC contract implemented end-to-end
- Tray icon + pause/resume

**Milestone 3 — Full Views + Settings (Week 3–4)**
- Weekly, Monthly/heatmap, App detail drill-down
- Settings screen (polling interval, idle threshold, categories, retention)
- Data export (CSV/JSON)

**Milestone 4 — Polish & Packaging (Week 4–5)**
- First-run onboarding + dependency checks (xdotool/wmctrl)
- Error handling edge cases (section 7.6)
- `.AppImage` + `.deb` builds via electron-builder
- README + privacy documentation

**Milestone 5 (Stretch, v1.1)**
- Wayland support investigation (`wlrctl` / compositor-specific hooks)
- Browser extension for per-tab/URL tracking
- `.rpm` / AUR packaging

---

## 11. Open Questions

- Should idle time be shown in the dashboard at all, or only active time? (Recommendation: show both, clearly separated)
- Should there be a "focus session" / Pomodoro-style feature layered on top later? (Explicitly out of scope for v1 per section 1.4, but worth flagging as a common feature request)
- App icon extraction: should the app try to pull real app icons (via `.desktop` file lookup / icon theme) for the list view, or use generic placeholders in v1? (Recommendation: generic first-letter avatar in v1, real icons as v1.1 polish)
- Multi-monitor behavior: if a window spans/is dragged across monitors, does this affect `active-win` results? (Needs testing — flag as a QA item)

---

## 12. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `active-win` reliability varies across desktop environments (GNOME/KDE/XFCE) | Medium | Test on at least 2 major DEs before v1 ship; document known issues |
| Wayland adoption growing on Linux distros, X11-only limits addressable market | Medium | Clearly document limitation; plan Wayland support as fast-follow |
| `better-sqlite3` native module rebuild issues across Electron versions | Low-Medium | Pin exact Electron + better-sqlite3 versions; test rebuild in CI |
| User perceives background tracking as invasive even though local-only | Low | Strong onboarding messaging + visible tray indicator + easy pause |

---

## 13. Appendix

### 13.1 Example `active-win` output (Linux/X11)
```json
{
  "title": "PRD.md - Visual Studio Code",
  "id": 41943044,
  "owner": {
    "name": "code",
    "processId": 12345,
    "path": "/usr/share/code/code"
  }
}
```

### 13.2 Glossary
- **Session**: a contiguous block of time spent in one app/window before switching
- **Idle**: period where no keyboard/mouse input detected beyond the configured threshold
- **X11 / Wayland**: the two display server protocols on Linux; determines which system APIs are available for window inspection

---

## License

This project is open source. Choose a license and add it to `LICENSE`.

## Contributing

Contributions are welcome. Please open an issue or submit a pull request.

## Privacy

All data is stored locally on your device. No telemetry or analytics are collected.
