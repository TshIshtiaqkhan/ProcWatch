/**
 * wayland.tracker.js — Wayland Active Window Tracker
 *
 * Wayland, unlike X11, has no standard protocol for querying the active window.
 * Each compositor implements its own mechanism.  This module detects which
 * compositor is running and calls the matching backend on every poll tick.
 *
 * Supported compositors:
 *   • GNOME  — org.gnome.Shell.Introspect.GetWindows D-Bus method (GNOME 40+)
 *   • KDE    — kdotool (KDE's xdotool equivalent for Wayland)
 *   • Hyprland — hyprctl activewindow -j (native JSON)
 *   • Sway   — swaymsg -t get_tree (JSON tree with focused node)
 *
 * Fallback: If the compositor-native backend returns null, the module attempts
 * active-win (xdotool / xprop) to catch apps running under XWayland.
 *
 * Return shape matches active-win and windows.tracker.js:
 *   { title: string, owner: { name: string, processId: number, path: string } }
 */

const { execFile } = require("child_process");
const { logger } = require("../utils/logger");
const path = require("path");
const fs = require("fs");

// ─── Compositor Detection ─────────────────────────────────────────────────────
//
// Detected once at startup from environment variables and cached for the
// lifetime of the process.  Compositors set XDG_CURRENT_DESKTOP and/or
// compositor-specific env vars (HYPRLAND_INSTANCE_SIGNATURE, SWAYSOCK).

let _detectedCompositor = null;

/**
 * Detects which Wayland compositor is running.
 * @returns {"gnome" | "kde" | "hyprland" | "sway" | "unknown"}
 */
function detectCompositor() {
  if (_detectedCompositor !== null) return _detectedCompositor;

  const desktop = (process.env.XDG_CURRENT_DESKTOP || "").toLowerCase();
  const session = (process.env.DESKTOP_SESSION || "").toLowerCase();

  if (
    desktop.includes("gnome") ||
    desktop.includes("ubuntu") ||
    desktop.includes("pop") ||
    desktop.includes("unity") ||
    session.includes("gnome") ||
    session.includes("ubuntu")
  ) {
    _detectedCompositor = "gnome";
  } else if (
    desktop.includes("kde") ||
    desktop.includes("plasma") ||
    session.includes("plasma")
  ) {
    _detectedCompositor = "kde";
  } else if (
    desktop.includes("hyprland") ||
    process.env.HYPRLAND_INSTANCE_SIGNATURE
  ) {
    _detectedCompositor = "hyprland";
  } else if (desktop.includes("sway") || process.env.SWAYSOCK) {
    _detectedCompositor = "sway";
  } else {
    _detectedCompositor = "unknown";
  }

  logger.info(
    `[wayland.tracker] Detected compositor: ${_detectedCompositor} ` +
      `(XDG_CURRENT_DESKTOP=${process.env.XDG_CURRENT_DESKTOP || ""}, ` +
      `DESKTOP_SESSION=${process.env.DESKTOP_SESSION || ""})`
  );
  return _detectedCompositor;
}

// ─── PID → App Identity ──────────────────────────────────────────────────────
//
// On Linux we can resolve a PID to a human-readable application name and
// executable path by reading from the /proc filesystem.  Zero dependencies.

/**
 * Reads the short process name from /proc/<pid>/comm, falling back to the
 * basename of argv[0] from /proc/<pid>/cmdline.
 */
function getAppNameFromPid(pid) {
  if (!pid || pid <= 0) return "Unknown";
  try {
    const comm = fs.readFileSync(`/proc/${pid}/comm`, "utf8").trim();
    if (comm) return comm;
  } catch {}
  try {
    const cmdline = fs.readFileSync(`/proc/${pid}/cmdline`, "utf8");
    const exe = cmdline.split("\0")[0];
    if (exe) return path.basename(exe);
  } catch {}
  return "Unknown";
}

/**
 * Resolves the real executable path from /proc/<pid>/exe symlink.
 */
function getAppPathFromPid(pid) {
  if (!pid || pid <= 0) return "";
  try {
    return fs.readlinkSync(`/proc/${pid}/exe`);
  } catch {}
  return "";
}

// ─── Utility: Run command with timeout ────────────────────────────────────────

/**
 * Spawns a one-shot command and resolves with { ok, stdout, stderr }.
 * Never rejects — failures return ok: false.
 */
function runCommand(cmd, args, timeoutMs = 2000) {
  return new Promise((resolve) => {
    try {
      execFile(
        cmd,
        args,
        { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) {
            resolve({ ok: false, stdout: "", stderr: stderr || err.message });
          } else {
            resolve({ ok: true, stdout: stdout || "", stderr: stderr || "" });
          }
        }
      );
    } catch (e) {
      resolve({ ok: false, stdout: "", stderr: e.message });
    }
  });
}

// ─── GNOME Backend ────────────────────────────────────────────────────────────
//
// GNOME exposes window metadata through the org.gnome.Shell.Introspect D-Bus
// interface.  The GetWindows method returns a GVariant dictionary of all managed
// windows including focus state, title, WM class, app-id, and PID.
//
// Access policy history:
//   • GNOME 45+ (Oct 2023): GetWindows is unrestricted for all callers.
//   • GNOME 40–44: Restricted to an allowlist — returns AccessDenied for
//     non-allowlisted callers.  On these versions we log a one-time warning
//     and fall back to XWayland tracking (which still covers Chrome, VS Code,
//     Firefox, and other Electron/X11 apps).

let _gnomeIntrospectFailed = false;

async function gnomeGetActiveWindow() {
  if (_gnomeIntrospectFailed) return null;

  const result = await runCommand(
    "gdbus",
    [
      "call",
      "--session",
      "--dest",
      "org.gnome.Shell",
      "--object-path",
      "/org/gnome/Shell/Introspect",
      "--method",
      "org.gnome.Shell.Introspect.GetWindows",
    ],
    3000
  );

  if (!result.ok) {
    if (
      result.stderr.includes("AccessDenied") ||
      result.stderr.includes("not allowed")
    ) {
      _gnomeIntrospectFailed = true;
      logger.warn(
        "[wayland.tracker] GNOME Introspect.GetWindows access denied. " +
          "This GNOME version (< 45) restricts the API to allowlisted callers. " +
          "Falling back to XWayland tracking via active-win. " +
          "Native Wayland apps may not be tracked. " +
          "Upgrade to GNOME 45+ for full Wayland support."
      );
    }
    return null;
  }

  return parseGnomeWindows(result.stdout);
}

/**
 * Parses the GVariant text output of GetWindows and returns the focused window.
 *
 * The output follows this pattern (abridged):
 *   ({uint64 1234: {'title': <'GitHub'>, 'wm-class': <'google-chrome'>,
 *     'app-id': <'google-chrome'>, 'pid': <uint32 5678>,
 *     'has-focus': <true>, ...}, ...},)
 *
 * Strategy:
 *   1. Locate the 'has-focus': <true> marker in the raw text
 *   2. Walk backwards/forwards to find the enclosing { } property dict
 *   3. Extract title, wm-class, app-id, pid from that block via regex
 *
 * NOTE: Brace counting does not skip over string literals, so a window title
 * containing literal { or } could in theory cause a mis-parse.  This is
 * extremely rare in practice and the worst case is returning null for one
 * poll tick.
 */
function parseGnomeWindows(raw) {
  try {
    // 1. Find the focused window marker
    const focusIndex = raw.indexOf("'has-focus': <true>");
    if (focusIndex === -1) return null;

    // 2. Walk backwards to find the opening '{' of this window's property dict.
    //    We track brace depth so that we stop at the correct nesting level
    //    (the inner dict, not the outer container).
    let braceDepth = 0;
    let blockStart = 0;
    for (let i = focusIndex; i >= 0; i--) {
      if (raw[i] === "}") braceDepth++;
      if (raw[i] === "{") {
        if (braceDepth === 0) {
          blockStart = i;
          break;
        }
        braceDepth--;
      }
    }

    // 3. Walk forwards to find the matching closing '}'
    braceDepth = 0;
    let blockEnd = raw.length;
    for (let i = blockStart; i < raw.length; i++) {
      if (raw[i] === "{") braceDepth++;
      if (raw[i] === "}") {
        braceDepth--;
        if (braceDepth === 0) {
          blockEnd = i + 1;
          break;
        }
      }
    }

    const block = raw.substring(blockStart, blockEnd);

    // 4. Extract fields with targeted regex patterns
    const titleMatch = block.match(/'title':\s*<'([\s\S]*?)'>/);
    const wmClassMatch = block.match(/'wm-class':\s*<'([\s\S]*?)'>/);
    const appIdMatch = block.match(/'app-id':\s*<'([\s\S]*?)'>/);
    const pidMatch = block.match(/'pid':\s*<uint32\s+(\d+)>/);

    const title = titleMatch ? titleMatch[1] : "";
    const wmClass = wmClassMatch ? wmClassMatch[1] : "";
    const appId = appIdMatch ? appIdMatch[1] : "";
    const pid = pidMatch ? parseInt(pidMatch[1], 10) : 0;

    // 5. Determine app name:  wm-class → app-id last segment → /proc lookup
    let appName = wmClass;
    if (!appName && appId) {
      // Reverse-DNS app-id like "org.gnome.Terminal" → use last segment
      const segments = appId.split(".");
      appName = segments[segments.length - 1] || appId;
    }
    if (!appName && pid > 0) {
      appName = getAppNameFromPid(pid);
    }

    return {
      title,
      owner: {
        name: appName || "Unknown",
        processId: pid,
        path: pid > 0 ? getAppPathFromPid(pid) : "",
      },
    };
  } catch (err) {
    logger.error(
      "[wayland.tracker] GNOME window parse error:",
      err.message
    );
    return null;
  }
}

// ─── KDE Plasma Backend ──────────────────────────────────────────────────────
//
// KDE Plasma on Wayland does not expose a simple D-Bus method for the active
// window.  The most reliable approach is `kdotool` — a community-maintained
// tool purpose-built as the Wayland equivalent of xdotool for KDE.
//
// Install: https://github.com/jinliu/kdotool
//   • Arch: yay -S kdotool
//   • Other: cargo install kdotool
//
// If kdotool is not installed, the fallback to active-win (XWayland) is used.

let _kdotoolMissing = false;

async function kdeGetActiveWindow() {
  if (_kdotoolMissing) return null;

  // Step 1: Get the active window ID
  const idResult = await runCommand("kdotool", ["getactivewindow"], 1500);
  if (!idResult.ok) {
    if (
      idResult.stderr.includes("not found") ||
      idResult.stderr.includes("No such file")
    ) {
      _kdotoolMissing = true;
      logger.warn(
        "[wayland.tracker] kdotool not found. For full Wayland support on KDE Plasma, " +
          "install kdotool (https://github.com/jinliu/kdotool). " +
          "Falling back to XWayland tracking via active-win."
      );
    }
    return null;
  }

  const windowId = idResult.stdout.trim();
  if (!windowId) return null;

  // Step 2: Query window properties in parallel
  const [nameRes, titleRes, pidRes] = await Promise.all([
    runCommand("kdotool", ["getwindowclassname", windowId], 1500),
    runCommand("kdotool", ["getwindowname", windowId], 1500),
    runCommand("kdotool", ["getwindowpid", windowId], 1500),
  ]);

  const appName = nameRes.ok ? nameRes.stdout.trim() : "";
  const title = titleRes.ok ? titleRes.stdout.trim() : "";
  const pid = pidRes.ok ? parseInt(pidRes.stdout.trim(), 10) : 0;

  return {
    title,
    owner: {
      name: appName || getAppNameFromPid(pid),
      processId: pid,
      path: pid > 0 ? getAppPathFromPid(pid) : "",
    },
  };
}

// ─── Hyprland Backend ─────────────────────────────────────────────────────────
//
// Hyprland provides `hyprctl activewindow -j` which returns the focused
// window as a JSON object with fields: class, title, pid, and more.
// Extremely fast (sub-5ms), zero parsing complexity.

async function hyprlandGetActiveWindow() {
  const result = await runCommand("hyprctl", ["activewindow", "-j"], 1500);
  if (!result.ok) return null;

  try {
    const data = JSON.parse(result.stdout);
    if (!data || (!data.class && !data.title)) return null;

    const pid = data.pid || 0;
    return {
      title: data.title || "",
      owner: {
        name: data.class || data.initialClass || getAppNameFromPid(pid),
        processId: pid,
        path: pid > 0 ? getAppPathFromPid(pid) : "",
      },
    };
  } catch {
    return null;
  }
}

// ─── Sway Backend ─────────────────────────────────────────────────────────────
//
// Sway provides `swaymsg -t get_tree` which returns the full window tree as
// JSON.  We walk the tree recursively to find the leaf node with
// `"focused": true`.  Sway uses `app_id` for native Wayland windows and
// `window_properties.class` for XWayland windows.

async function swayGetActiveWindow() {
  const result = await runCommand("swaymsg", ["-t", "get_tree"], 2000);
  if (!result.ok) return null;

  try {
    const tree = JSON.parse(result.stdout);
    const focused = findFocusedNode(tree);
    if (!focused) return null;

    const pid = focused.pid || 0;
    return {
      title: focused.name || "",
      owner: {
        name:
          focused.app_id ||
          (focused.window_properties && focused.window_properties.class) ||
          getAppNameFromPid(pid),
        processId: pid,
        path: pid > 0 ? getAppPathFromPid(pid) : "",
      },
    };
  } catch {
    return null;
  }
}

/**
 * Recursively walks a Sway/i3 tree to find the focused leaf container.
 * Sway window tree has 'nodes' for tiled and 'floating_nodes' for floating.
 */
function findFocusedNode(node) {
  if (!node) return null;

  // A focused leaf container (has a PID = is an actual window, not a workspace)
  if (
    node.focused &&
    node.pid &&
    (node.type === "con" || node.type === "floating_con")
  ) {
    return node;
  }

  // Recurse into tiled children
  if (node.nodes) {
    for (const child of node.nodes) {
      const found = findFocusedNode(child);
      if (found) return found;
    }
  }

  // Recurse into floating children
  if (node.floating_nodes) {
    for (const child of node.floating_nodes) {
      const found = findFocusedNode(child);
      if (found) return found;
    }
  }

  return null;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────
//
// Routes each poll to the correct compositor backend.  If the native backend
// returns null, falls back to active-win (xdotool + xprop) which can still
// detect apps running under XWayland.

let _activeWinFallback = null;
let _activeWinFallbackFailed = false;

/**
 * Returns the currently focused window on a Wayland session.
 *
 * Follows the same return shape as active-win and windows.tracker:
 * {
 *   title: string,
 *   owner: { name: string, processId: number, path: string }
 * }
 *
 * Returns null when no window is focused or detection fails.
 */
async function getActiveWindow() {
  if (process.platform !== "linux") return null;

  const compositor = detectCompositor();
  let result = null;

  // ── Try compositor-native backend ──
  switch (compositor) {
    case "gnome":
      result = await gnomeGetActiveWindow();
      break;
    case "kde":
      result = await kdeGetActiveWindow();
      break;
    case "hyprland":
      result = await hyprlandGetActiveWindow();
      break;
    case "sway":
      result = await swayGetActiveWindow();
      break;
    // "unknown" — skip native, go straight to fallback
  }

  if (result) return result;

  // ── Fallback: try active-win for XWayland apps ──
  // active-win uses xdotool / xprop under the hood.  On Wayland sessions,
  // XWayland is usually running and many apps (Chrome, VS Code, Firefox)
  // run under it, so this fallback covers a significant portion of usage.
  if (!_activeWinFallbackFailed) {
    try {
      if (!_activeWinFallback) {
        _activeWinFallback = require("active-win");
      }
      const aw = await _activeWinFallback();
      if (aw) return aw;
    } catch {
      // active-win threw (no X server, xdotool missing, etc.)
      _activeWinFallbackFailed = true;
      logger.warn(
        "[wayland.tracker] active-win (XWayland) fallback failed. " +
          "XWayland apps won't be tracked.  Install xdotool for partial coverage."
      );
    }
  }

  return null;
}

/**
 * Resets all cached state.  Useful for testing or when the session changes.
 */
function resetWaylandTracker() {
  _detectedCompositor = null;
  _gnomeIntrospectFailed = false;
  _kdotoolMissing = false;
  _activeWinFallbackFailed = false;
  _activeWinFallback = null;
}

module.exports = {
  getActiveWindow,
  detectCompositor,
  resetWaylandTracker,
  // Exported for unit testing of internal parsers
  parseGnomeWindows,
  findFocusedNode,
  getAppNameFromPid,
  getAppPathFromPid,
};
