const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { app } = require("electron");
const { logger } = require("./logger");

const DEFAULT_SETTINGS = {
  polling_interval_seconds: "5",
  idle_threshold_seconds: "90",
  data_retention_days: "never",
  launch_on_login: "false",
  start_minimized: "true",
  close_to_tray: "true",
  first_run_complete: "false",
  focus_session_duration_minutes: "25",
  focus_session_break_minutes: "5",
  focus_session_block_mode: "overlay",
};

const DEFAULT_CATEGORIES = {
  code: "Development",
  "code-oss": "Development",
  codium: "Development",
  firefox: "Browser",
  "firefox-esr": "Browser",
  chromium: "Browser",
  "google-chrome-stable": "Browser",
  slack: "Communication",
  discord: "Communication",
  telegram: "Communication",
  spotify: "Entertainment",
  vlc: "Entertainment",
  terminal: "System",
  "gnome-terminal": "System",
  kitty: "System",
  alacritty: "System",
  nautilus: "System",
  thunar: "System",
  gimp: "Creative",
  inkscape: "Creative",
};

let dbConnection = null;

// Mock PG-style pool query interface for compatibility
const pool = {
  query: async (sql, params = []) => {
    if (!dbConnection) {
      throw new Error("Database not initialized");
    }
    
    const newParams = [];
    // Replace Postgres style $1, $2 with ? placeholders and map params
    const sqliteSql = sql.replace(/\$(\d+)/g, (match, number) => {
      const index = parseInt(number, 10) - 1;
      newParams.push(params[index]);
      return "?";
    });
    
    const trimmed = sqliteSql.trim().toUpperCase();
    const isSelect = trimmed.startsWith("SELECT") || sqliteSql.includes("RETURNING");

    try {
      const stmt = dbConnection.prepare(sqliteSql);
      if (isSelect) {
        const rows = stmt.all(...newParams);
        return { rows };
      } else {
        const info = stmt.run(...newParams);
        return {
          rows: [],
          rowCount: info.changes,
          lastInsertRowid: info.lastInsertRowid,
        };
      }
    } catch (err) {
      logger.error(`SQLite query error on statement [${sqliteSql}] with params [${newParams}] (original: [${params}]):`, err.message, err.stack);
      throw err;
    }
  }
};

function getPool() {
  return pool;
}

async function initDatabase() {
  const dbDir = path.join(
    process.env.XDG_CONFIG_HOME || path.join(app.getPath("home"), ".config"),
    "screen-time-app"
  );
  fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "screen_time.db");

  logger.info(`Initializing SQLite database at: ${dbPath}`);

  try {
    dbConnection = new Database(dbPath);
    
    // Run integrity check
    const check = dbConnection.prepare("PRAGMA integrity_check").get();
    if (!check || check.integrity_check !== "ok") {
      logger.error("Database integrity check failed. Database file is corrupted.");
      throw new Error("Corrupted database");
    }
    
    dbConnection.pragma("journal_mode = WAL");
  } catch (err) {
    logger.error("Failed to open SQLite database file, attempting recovery:", err.message);
    if (dbConnection) {
      try { dbConnection.close(); } catch {}
      dbConnection = null;
    }
    
    // Try to move corrupted database file to backup and recreate
    try {
      const backupPath = `${dbPath}.corrupted-${Date.now()}`;
      if (fs.existsSync(dbPath)) {
        fs.renameSync(dbPath, backupPath);
        logger.info(`Corrupted database file backed up to: ${backupPath}`);
      }
      
      // Re-initialize a fresh DB
      dbConnection = new Database(dbPath);
      dbConnection.pragma("journal_mode = WAL");
    } catch (recreateErr) {
      logger.error("Critical: Failed to recreate fresh database file:", recreateErr.message, recreateErr.stack);
      throw recreateErr;
    }
  }

  // Ensure schema_version table exists
  dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    )
  `);

  // Check current version
  const row = dbConnection.prepare("SELECT version FROM schema_version").get();
  const version = row?.version ?? 0;

  if (version < 1) {
    const migrationPath = app.isPackaged
      ? path.join(process.resourcesPath, "migrations.sql")
      : path.join(__dirname, "migrations.sql");
    
    logger.info(`Running migration from: ${migrationPath}`);
    const migrationSql = fs.readFileSync(migrationPath, "utf8");
    
    // Execute migration in transaction
    dbConnection.transaction(() => {
      dbConnection.exec(migrationSql);
      
      // Seed settings
      const insertSetting = dbConnection.prepare(
        "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
      );
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        insertSetting.run(key, value);
      }

      // Seed categories
      const insertCategory = dbConnection.prepare(
        "INSERT OR IGNORE INTO app_categories (app_name, category) VALUES (?, ?)"
      );
      for (const [appName, category] of Object.entries(DEFAULT_CATEGORIES)) {
        insertCategory.run(appName, category);
      }

      // Update schema version
      dbConnection.prepare(
        "INSERT OR REPLACE INTO schema_version (version) VALUES (1)"
      ).run();
    })();
  }

  if (version < 2) {
    logger.info("Running migration v2: focus session support");
    dbConnection.transaction(() => {
      // Safely check if is_distracting column already exists
      const columns = dbConnection.pragma("table_info(app_categories)");
      const hasIsDistracting = columns.some((col) => col.name === "is_distracting");
      if (!hasIsDistracting) {
        dbConnection.exec(
          "ALTER TABLE app_categories ADD COLUMN is_distracting INTEGER NOT NULL DEFAULT 0;"
        );
      }

      dbConnection.exec(`
        CREATE TABLE IF NOT EXISTS focus_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          start_time TEXT NOT NULL,
          end_time TEXT,
          duration_minutes INTEGER NOT NULL,
          completed INTEGER NOT NULL DEFAULT 0,
          distractions INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_focus_sessions_start_time ON focus_sessions(start_time);
      `);

      const insertSetting = dbConnection.prepare(
        "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
      );
      insertSetting.run("focus_session_duration_minutes", "25");
      insertSetting.run("focus_session_break_minutes", "5");
      insertSetting.run("focus_session_block_mode", "overlay");

      dbConnection.prepare(
        "INSERT OR REPLACE INTO schema_version (version) VALUES (2)"
      ).run();
    })();
  }


  return pool;
}

async function getSetting(key) {
  const row = dbConnection.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row?.value ?? DEFAULT_SETTINGS[key];
}

async function setSetting(key, value) {
  dbConnection.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

async function purgeOldSessions() {
  const retentionDays = await getSetting("data_retention_days");
  if (retentionDays === "never") return;

  const days = parseInt(retentionDays, 10);
  if (isNaN(days) || days <= 0) return;

  dbConnection.prepare(
    "DELETE FROM sessions WHERE datetime(start_time) < datetime('now', '-' || ? || ' days')"
  ).run(days);
}

async function closeDatabase() {
  if (dbConnection) {
    dbConnection.close();
    dbConnection = null;
  }
}

module.exports = {
  DEFAULT_SETTINGS,
  getPool,
  initDatabase,
  getSetting,
  setSetting,
  purgeOldSessions,
  closeDatabase,
};
