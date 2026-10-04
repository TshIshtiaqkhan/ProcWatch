const { spawn, execFile } = require("child_process");
const { logger } = require("../utils/logger");
const { normalizeAppName } = require("../utils/paths");

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
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public class WinTracker {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern int GetWindowTextW(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string className, string windowTitle);

    public static string GetActiveWindowJson() {
        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) {
            return "{}";
        }

        StringBuilder sb = new StringBuilder(1024);
        GetWindowTextW(hwnd, sb, 1024);
        string title = sb.ToString();

        int pid = 0;
        GetWindowThreadProcessId(hwnd, out pid);
        string name = "";
        string path = "";

        if (pid > 0) {
            try {
                Process p = Process.GetProcessById(pid);
                if (p != null) {
                    name = p.ProcessName;

                    // If ApplicationFrameHost (Windows 10/11 UWP wrapper), inspect child CoreWindow
                    if (string.Equals(name, "ApplicationFrameHost", StringComparison.OrdinalIgnoreCase)) {
                        IntPtr coreWindow = FindWindowEx(hwnd, IntPtr.Zero, "Windows.UI.Core.CoreWindow", null);
                        if (coreWindow != IntPtr.Zero) {
                            int realPid = 0;
                            GetWindowThreadProcessId(coreWindow, out realPid);
                            if (realPid > 0 && realPid != pid) {
                                try {
                                    Process realProc = Process.GetProcessById(realPid);
                                    if (realProc != null) {
                                        name = realProc.ProcessName;
                                        try { path = realProc.MainModule.FileName; } catch {}
                                    }
                                } catch {}
                            }
                        }
                    }

                    if (string.IsNullOrEmpty(path)) {
                        try { path = p.MainModule.FileName; } catch {}
                    }
                }
            } catch {}
        }

        string safeTitle = EscapeJson(title);
        string safeName = EscapeJson(name);
        string safePath = EscapeJson(path);

        return string.Format("{{\\"title\\":\\"{0}\\",\\"processId\\":{1},\\"name\\\":\\"{2}\\",\\"path\\\":\\"{3}\\"}}",
            safeTitle, pid, safeName, safePath);
    }

    private static string EscapeJson(string s) {
        if (string.IsNullOrEmpty(s)) return "";
        return s.Replace("\\\\", "\\\\\\\\").Replace("\\"", "\\\\\\"").Replace("\\r", "").Replace("\\n", " ");
    }
}
"@
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::Out.WriteLine("__READY__")

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($line -eq $null) { break }
    try {
        $json = [WinTracker]::GetActiveWindowJson()
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

      // Timeout fallback in case compilation hangs on cold start
      setTimeout(() => {
        if (!psReady) {
          logger.warn("[windows.tracker] PowerShell worker init timeout");
          resolve(false);
        }
      }, 15000);
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
      using System.Diagnostics;
      using System.Runtime.InteropServices;
      using System.Text;
      public class Win {
          [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
          [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Unicode)] public static extern int GetWindowTextW(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
          [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId);
          [DllImport("user32.dll", SetLastError = true)] public static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string className, string windowTitle);
          public static string Query() {
              IntPtr h = GetForegroundWindow();
              if (h == IntPtr.Zero) return "{}";
              StringBuilder sb = new StringBuilder(1024);
              GetWindowTextW(h, sb, 1024);
              int pid = 0;
              GetWindowThreadProcessId(h, out pid);
              string name = "";
              string path = "";
              if (pid > 0) {
                  try {
                      Process p = Process.GetProcessById(pid);
                      if (p != null) {
                          name = p.ProcessName;
                          if (string.Equals(name, "ApplicationFrameHost", StringComparison.OrdinalIgnoreCase)) {
                              IntPtr cw = FindWindowEx(h, IntPtr.Zero, "Windows.UI.Core.CoreWindow", null);
                              if (cw != IntPtr.Zero) {
                                  int rpid = 0;
                                  GetWindowThreadProcessId(cw, out rpid);
                                  if (rpid > 0 && rpid != pid) {
                                      try {
                                          Process rp = Process.GetProcessById(rpid);
                                          if (rp != null) { name = rp.ProcessName; try { path = rp.MainModule.FileName; } catch {} }
                                      } catch {}
                                  }
                              }
                          }
                          if (string.IsNullOrEmpty(path)) { try { path = p.MainModule.FileName; } catch {} }
                      }
                  } catch {}
              }
              string st = (sb.ToString() ?? "").Replace("\\\\", "\\\\\\\\").Replace("\\"", "\\\\\\"").Replace("\\r", "").Replace("\\n", " ");
              string sn = (name ?? "").Replace("\\\\", "\\\\\\\\").Replace("\\"", "\\\\\\"");
              string sp = (path ?? "").Replace("\\\\", "\\\\\\\\").Replace("\\"", "\\\\\\"");
              return string.Format("{{\\"title\\":\\"{0}\\",\\"processId\\":{1},\\"name\\\":\\"{2}\\",\\"path\\\":\\"{3}\\"}}", st, pid, sn, sp);
          }
      }
"@
      [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
      [Console]::Out.WriteLine([Win]::Query())
    `;

    execFile(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", psCmd],
      { timeout: 5000, windowsHide: true },
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
