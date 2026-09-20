const { spawn, execFile } = require("child_process");
const { logger } = require("../utils/logger");

/**
 * Normalizes an application name cross-platform:
 * - Strips trailing .exe (case-insensitive)
 * - Trims whitespace
 * - Fallbacks to "Unknown" if missing or invalid
 *
 * @param {string} rawName
 * @returns {string}
 */
function normalizeAppName(rawName) {
  if (!rawName || typeof rawName !== "string") return "Unknown";
  let clean = rawName.trim();
  clean = clean.replace(/\.exe$/i, "");
  return clean || "Unknown";
}

// ─── Long-running PowerShell Subsystem ───────────────────────────────────────
//
// Running a separate PowerShell process on every 5s poll causes high CPU usage
// and latency (~300-600ms per spawn). Instead, we launch a single persistent
// PowerShell process that compiles the Win32 P/Invoke declarations ONCE and
// responds to newline triggers over stdin/stdout in ~2ms.

let psProcess = null;
let psReady = false;
let pendingResolvers = [];
let spawnPromise = null;

const PS_INIT_SCRIPT = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WinTracker {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern int GetWindowTextW(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::Out.WriteLine("__READY__")

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($line -eq $null) { break }
    try {
        $hwnd = [WinTracker]::GetForegroundWindow()
        if ($hwnd -eq [IntPtr]::Zero) {
            [Console]::Out.WriteLine("{}")
            continue
        }
        $sb = New-Object System.Text.StringBuilder 1024
        [WinTracker]::GetWindowTextW($hwnd, $sb, 1024) | Out-Null
        $title = $sb.ToString()
        $pidVal = 0
        [WinTracker]::GetWindowThreadProcessId($hwnd, [ref]$pidVal) | Out-Null
        $name = ""
        $path = ""
        if ($pidVal -gt 0) {
            try {
                $p = [System.Diagnostics.Process]::GetProcessById($pidVal)
                if ($p) {
                    $name = $p.ProcessName
                    try { $path = $p.MainModule.FileName } catch {}
                }
            } catch {}
        }
        $obj = @{
            title = $title
            processId = $pidVal
            name = $name
            path = $path
        }
        $json = $obj | ConvertTo-Json -Compress
        [Console]::Out.WriteLine($json)
    } catch {
        [Console]::Out.WriteLine("{}")
    }
}
`;

function initPowerShellWorker() {
  if (spawnPromise) return spawnPromise;

  spawnPromise = new Promise((resolve) => {
    try {
      psReady = false;
      psProcess = spawn(
        "powershell.exe",
        ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "-"],
        {
          stdio: ["pipe", "pipe", "ignore"],
          windowsHide: true,
        }
      );

      let buffer = "";

      psProcess.stdout.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop(); // keep partial line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed === "__READY__") {
            psReady = true;
            resolve(true);
            continue;
          }

          if (pendingResolvers.length > 0) {
            const resolver = pendingResolvers.shift();
            try {
              const data = JSON.parse(trimmed);
              resolver(data);
            } catch {
              resolver(null);
            }
          }
        }
      });

      psProcess.on("error", (err) => {
        logger.error("[windows.tracker] PowerShell process error:", err.message);
        cleanupWorker();
        resolve(false);
      });

      psProcess.on("exit", (code) => {
        logger.info(`[windows.tracker] PowerShell process exited with code ${code}`);
        cleanupWorker();
        resolve(false);
      });

      // Send the initialization script
      psProcess.stdin.write(PS_INIT_SCRIPT + "\r\n");

      // Timeout fallback in case compilation hangs
      setTimeout(() => {
        if (!psReady) {
          logger.warn("[windows.tracker] PowerShell worker init timeout");
          resolve(false);
        }
      }, 5000);
    } catch (err) {
      logger.error("[windows.tracker] Failed to spawn PowerShell worker:", err);
      cleanupWorker();
      resolve(false);
    }
  });

  return spawnPromise;
}

function cleanupWorker() {
  psReady = false;
  spawnPromise = null;
  while (pendingResolvers.length > 0) {
    const resolver = pendingResolvers.shift();
    resolver(null);
  }
  if (psProcess) {
    try {
      psProcess.stdin?.end();
      psProcess.kill();
    } catch {}
    psProcess = null;
  }
}

/**
 * Queries active window using one-shot PowerShell execution (fallback).
 */
function queryActiveWindowOnce() {
  return new Promise((resolve) => {
    const psCmd = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      using System.Text;
      public class Win {
          [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
          [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Unicode)] public static extern int GetWindowTextW(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
          [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
      }
"@
      $h = [Win]::GetForegroundWindow()
      if ($h -ne [IntPtr]::Zero) {
          $sb = New-Object System.Text.StringBuilder 1024
          [Win]::GetWindowTextW($h, $sb, 1024) | Out-Null
          $pid = 0
          [Win]::GetWindowThreadProcessId($h, [ref]$pid) | Out-Null
          $p = [System.Diagnostics.Process]::GetProcessById($pid)
          @{ title = $sb.ToString(); processId = $pid; name = $p.ProcessName; path = $p.MainModule.FileName } | ConvertTo-Json -Compress
      }
    `;

    execFile(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", psCmd],
      { timeout: 3000, windowsHide: true },
      (err, stdout) => {
        if (err || !stdout.trim()) {
          return resolve(null);
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch {
          resolve(null);
        }
      }
    );
  });
}

/**
 * Returns active foreground window info on Windows:
 * {
 *   platform: "windows",
 *   title: string,
 *   owner: {
 *     name: string,
 *     processId: number,
 *     path: string
 *   }
 * }
 */
async function getActiveWindow() {
  if (process.platform !== "win32") {
    return null;
  }

  // Ensure persistent worker is started
  if (!psProcess || !psReady) {
    const ok = await initPowerShellWorker();
    if (!ok) {
      // Fallback to one-shot query if worker fails
      const fallback = await queryActiveWindowOnce();
      if (!fallback || !fallback.name) return null;
      return {
        platform: "windows",
        title: fallback.title || "",
        owner: {
          name: normalizeAppName(fallback.name),
          processId: fallback.processId || 0,
          path: fallback.path || "",
        },
      };
    }
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      // Remove from resolvers queue if timed out
      const idx = pendingResolvers.indexOf(handleResult);
      if (idx !== -1) pendingResolvers.splice(idx, 1);
      resolve(null);
    }, 2000);

    const handleResult = (raw) => {
      clearTimeout(timeout);
      if (!raw || !raw.name) {
        return resolve(null);
      }
      resolve({
        platform: "windows",
        title: raw.title || "",
        owner: {
          name: normalizeAppName(raw.name),
          processId: raw.processId || 0,
          path: raw.path || "",
        },
      });
    };

    pendingResolvers.push(handleResult);

    try {
      psProcess.stdin.write("poll\r\n");
    } catch (err) {
      logger.error("[windows.tracker] Failed to write to worker stdin:", err);
      cleanupWorker();
      resolve(null);
    }
  });
}

function disposeWindowsTracker() {
  cleanupWorker();
}

module.exports = {
  getActiveWindow,
  normalizeAppName,
  disposeWindowsTracker,
  queryActiveWindowOnce,
};
