# ProcWatch

A fully offline, privacy-first desktop application for **Linux** and **Windows (10 & 11)** that tracks how much time you spend in each application, stores everything locally in SQLite, enforces daily app limits, and presents deep insights through a modern visual dashboard. Built with Electron and React.

- **Version:** 1.3.0
- **Platform target:** Linux (X11) & Windows (10 & 11), Desktop, Fully Offline
- **License:** MIT
- **Status:** Stable

---

## 📥 Installation (For End Users)

You do **not** need Node.js or development tools to use ProcWatch. Choose the installation option for your operating system:

### 🪟 Windows (10 & 11)

Download the latest Windows build from [GitHub Releases](https://github.com/TshIshtiaqkhan/ProcWatch/releases/latest):

1. **NSIS Installer (`ProcWatch-Setup-1.3.0.exe`)**:
   - Run the installer to install ProcWatch with desktop and start menu shortcuts.
   - Automatically supports launching in the background on system start.
2. **Portable Executable (`ProcWatch-1.3.0.exe`)**:
   - Zero installation required. Simply download and double-click to run anywhere (USB drive, desktop, downloads).

---

### 🐧 Linux

Choose one of the convenient methods below:

#### Option 1: Cloudsmith APT Repository (Debian / Ubuntu / Pop!_OS / Linux Mint)
```bash
# 1. Add Cloudsmith repository key and source list
curl -1sLf 'https://dl.cloudsmith.io/public/ishtiaq-khan/procwatch/setup.deb.sh' | sudo -E bash

# 2. Install ProcWatch
sudo apt update && sudo apt install -y procwatch
```

#### Option 2: One-Line Terminal Script
```bash
curl -fsSL https://raw.githubusercontent.com/TshIshtiaqkhan/ProcWatch/main/install.sh | bash
```

#### Option 3: Debian / Ubuntu Package (`.deb`)
1. Download `procwatch_1.3.0_amd64.deb` from [GitHub Releases](https://github.com/TshIshtiaqkhan/ProcWatch/releases/latest) or [Cloudsmith](https://cloudsmith.io/~ishtiaq-khan/repos/procwatch/packages/).
2. Install via `apt` (automatically configures dependencies):
   ```bash
   sudo apt install ./procwatch_1.3.0_amd64.deb
   ```

#### Option 4: Universal Linux (`.AppImage`)
1. Download `ProcWatch-1.3.0.AppImage` from [GitHub Releases](https://github.com/TshIshtiaqkhan/ProcWatch/releases/latest).
2. Make it executable and run:
   ```bash
   chmod +x ProcWatch-*.AppImage
   ./ProcWatch-*.AppImage
   ```

---

## ✨ Key Features

- 🔒 **100% Local & Private**: All activity stays strictly on your computer in an embedded SQLite database. Zero cloud sync, zero telemetry, no accounts, and no network requests.
- ⚡ **Cross-Platform Tracking**:
  - **Linux**: Active window detection via `xdotool`, `wmctrl`, and `xprop`.
  - **Windows**: Zero-dependency native Win32 API bridge querying `GetForegroundWindow`, `GetWindowTextW`, and `GetWindowThreadProcessId` with sub-2ms latency. Crash-proof on modern Electron (no broken C++ `ref-napi` / `ffi-napi` pointer compression issues).
- ⏱️ **Daily App Usage Limits & Budgets**:
  - Set daily time budgets for distracting applications (e.g. YouTube, Discord, games).
  - Proactive desktop notifications at **80% (amber warning)** and **100% (exceeded)** with recurring 10-minute overtime reminders.
  - Live progress bars on the Today Dashboard with visual gauges.
- 🎯 **Focus Mode & Pomodoro**: Built-in customizable focus sessions with break timers and optional distraction overlay blockers.
- 🚀 **Silent Background Autostart**:
  - **Linux**: Automatically writes `~/.config/autostart/procwatch.desktop` with `--hidden`.
  - **Windows**: Native Windows Registry login startup via `app.setLoginItemSettings({ openAtLogin: true, args: ["--hidden"] })`.
  - Stays hidden in the system tray upon boot while tracking in the background. Single-instance lock ensures opening the app brings up the dashboard instantly.
- 📊 **Visual Analytics**:
  - **Today View**: Real-time active time, idle time, top application metrics, and limit gauges.
  - **Weekly View**: Daily breakdown bar charts categorized by development, browser, communication, etc.
  - **Monthly View**: GitHub-style activity heatmaps.
  - **App Detail**: Drill down into specific applications and individual window titles.
- 💾 **Data Ownership & Export**: One-click data backup export to CSV or JSON.

---

## 🛠️ Development & Building from Source (For Contributors)

ProcWatch is organized as an **npm workspaces monorepo** with a single root `node_modules`.

### Prerequisites

- **Node.js:** `>= 22.12.0` and `npm`
  ```bash
  # Check Node version
  node -v
  ```
- **Platform Prerequisites**:
  - **Linux**: Active X11 session. Install required utilities:
    - *Debian / Ubuntu / Mint:* `sudo apt install -y xdotool wmctrl x11-utils`
    - *Fedora / RHEL:* `sudo dnf install -y xdotool wmctrl xorg-x11-utils`
    - *Arch Linux:* `sudo pacman -S --needed xdotool wmctrl xorg-xprop`
  - **Windows**: Windows 10 or 11 with PowerShell (built-in).

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/TshIshtiaqkhan/ProcWatch.git
cd ProcWatch

# Single install at root (installs all workspace dependencies)
npm install

# Rebuild native modules for Electron
npm run rebuild
```

### 2. Run in Development Mode

```bash
# Terminal 1: Start React Vite frontend
npm run dev --workspace=frontend

# Terminal 2: Launch Electron backend
npm start
```

### 3. Run Automated Tests

```bash
npm test
```
Runs 31 unit tests across:
- Windows adapter & process name normalization (`backend/__tests__/windows-adapter.test.js`)
- App limits engine, threshold math & notification limits (`backend/__tests__/limits.test.js`)
- Focus session engine (`backend/__tests__/focus.test.js`)
- Path resolution & date formatters (`backend/__tests__/utils.test.js`)

### 4. Build & Package

```bash
# Build React frontend production bundle
npm run build:frontend

# Package unpacked directory for current host
npm run pack

# Package for Linux (.deb and .AppImage)
npm run dist:linux

# Package for Windows (NSIS setup installer and portable .exe)
npm run dist:win

# Universal dist for current OS
npm run dist
```

---

## 🏗️ Monorepo Project Structure

```
ProcWatch/
├── .github/
│   └── workflows/
│       └── release.yml          # GitHub Actions matrix CI/CD (Ubuntu + Windows)
├── backend/                     # Electron main process
│   ├── src/
│   │   ├── configs/             # Default settings and category mappings
│   │   ├── controllers/         # IPC business logic (limits, stats, autostart)
│   │   ├── db/                  # SQLite schema & migrations (v1-v4)
│   │   ├── models/
│   │   │   ├── focus.engine.js  # Focus mode & Pomodoro state machine
│   │   │   ├── limits.engine.js # Daily app limits & budget enforcement
│   │   │   ├── tracker.engine.js# Core polling loop & session manager
│   │   │   └── windows.tracker.js# Native Win32 API bridge for Windows
│   │   ├── routes/              # IPC handler registrations
│   │   ├── utils/               # Cross-platform paths, normalizer, logger
│   │   ├── main.js              # Electron app entry point & lifecycle
│   │   └── preload.js           # Secure contextBridge API
│   ├── __tests__/               # Jest unit tests
│   └── package.json             # Workspace package config
├── frontend/                    # React 18 user interface
│   ├── src/
│   │   ├── components/          # Dashboard cards, charts, modals, layout
│   │   ├── hooks/               # useUsage, useAppLimits, useFocus, useSettings
│   │   ├── pages/               # Today, Weekly, Monthly, AppDetail, Settings, Onboarding
│   │   ├── App.jsx              # Routing & toast alert notifications
│   │   └── main.jsx             # React entry
│   └── package.json             # Workspace package config
├── package.json                 # Root npm workspaces config & electron-builder targets
└── README.md
```

---

## 🚀 CI/CD & Automated GitHub Releases

Automated cross-platform builds are handled via GitHub Actions on every tag push (`v*` or `[0-9]*`):

1. **`build-linux` (ubuntu-latest)**:
   - Compiles native modules against Electron 33.
   - Builds frontend production bundle.
   - Packages `.AppImage` and `.deb`.
   - Deploys Debian packages to Cloudsmith APT repository and uploads assets to GitHub Releases.
2. **`build-windows` (windows-latest)**:
   - Compiles native `better-sqlite3` on Windows.
   - Builds frontend bundle.
   - Packages NSIS installer (`.exe`) and portable standalone (`.exe`).
   - Automatically attaches `.exe` assets to GitHub Releases.

---

## 🔒 Privacy Guarantee

- **No Network Requests**: ProcWatch never connects to any remote server or API.
- **Local Storage**: Data is saved in `%APPDATA%\procwatch\screen_time.db` on Windows and `~/.config/procwatch/screen_time.db` on Linux.
- **You Own Your Data**: You can inspect the SQLite database, export everything to CSV/JSON, or wipe all records at any time from Settings.

---

## 📄 License

ProcWatch is open-source software licensed under the [MIT License](LICENSE).
