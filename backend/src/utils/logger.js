const fs = require("fs");
const path = require("path");
const { getAppConfigDir, formatDateString } = require("./paths");

const LOG_DIR = path.join(getAppConfigDir(), "logs");

const MAX_LOG_BYTES = 5 * 1024 * 1024; // 5MB per file

const MAX_LOG_AGE_DAYS = 30;

let initialized = false;

function cleanOldLogs() {
  try {
    const files = fs.readdirSync(LOG_DIR);
    const now = Date.now();
    const maxAgeMs = MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (file.startsWith("app-") && (file.endsWith(".log") || file.includes(".log."))) {
        const filePath = path.join(LOG_DIR, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
        }
      }
    }
  } catch (err) {
    console.error("Failed to clean old logs:", err);
  }
}

function ensureLogDir() {
  if (initialized) return;
  fs.mkdirSync(LOG_DIR, { recursive: true });
  cleanOldLogs();
  initialized = true;
}

function getLogPath() {
  const date = formatDateString(new Date());
  return path.join(LOG_DIR, `app-${date}.log`);
}

const MAX_BACKUP_FILES = 3;

function rotateIfNeeded(logPath) {
  try {
    const stat = fs.statSync(logPath);
    if (stat.size >= MAX_LOG_BYTES) {
      for (let i = MAX_BACKUP_FILES; i >= 1; i--) {
        const currentFile = logPath.replace(".log", `.${i}.log`);
        if (i === MAX_BACKUP_FILES) {
          if (fs.existsSync(currentFile)) fs.unlinkSync(currentFile);
        } else {
          const nextFile = logPath.replace(".log", `.${i + 1}.log`);
          if (fs.existsSync(currentFile)) {
            if (fs.existsSync(nextFile)) fs.unlinkSync(nextFile);
            fs.renameSync(currentFile, nextFile);
          }
        }
      }
      const firstBackup = logPath.replace(".log", ".1.log");
      if (fs.existsSync(firstBackup)) fs.unlinkSync(firstBackup);
      fs.renameSync(logPath, firstBackup);
    }
  } catch {
    // File doesn't exist yet, no rotation needed
  }
}

let writeQueue = [];
let isWriting = false;

function processQueue() {
  if (isWriting || writeQueue.length === 0) return;
  isWriting = true;
  const chunk = writeQueue.join("");
  writeQueue = [];
  const logPath = getLogPath();
  rotateIfNeeded(logPath);

  fs.appendFile(logPath, chunk, "utf8", (err) => {
    isWriting = false;
    if (err) {
      console.error(`[LOG FAIL] Failed to write log chunk:`, err);
    }
    if (writeQueue.length > 0) {
      processQueue();
    }
  });
}

function writeLog(level, ...args) {
  ensureLogDir();

  const timestamp = new Date().toISOString();
  const message = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  const line = `[${timestamp}] [${level}] ${message}\n`;

  writeQueue.push(line);
  processQueue();

  // Also output to console in development
  if (process.env.NODE_ENV === "development") {
    if (level === "ERROR") console.error(line.trimEnd());
    else if (level === "WARN") console.warn(line.trimEnd());
    else console.log(line.trimEnd());
  }
}

const logger = {
  info: (...args) => writeLog("INFO", ...args),
  warn: (...args) => writeLog("WARN", ...args),
  error: (...args) => writeLog("ERROR", ...args),
};

module.exports = { logger };
