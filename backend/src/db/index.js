const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { app } = require("electron");
const { logger } = require("../utils/logger");
const { getAppConfigDir } = require("../utils/paths");
const { DEFAULT_SETTINGS, DEFAULT_CATEGORIES } = require("../configs");

let dbConnection = null;

// ─── Statement Cache ──────────────────────────────────────────────────────────
//
// better-sqlite3's biggest perf advantage is compiled prepared statements.
// The original code called dbConnection.prepare(sql) on every query call,
// which threw away that advantage entirely. We now compile each unique SQL
// string once and reuse the compiled statement on subsequent calls.

const stmtCache = new Map();

function getStmt(sql) {
  if (!stmtCache.has(sql)) {
    stmtCache.set(sql, dbConnection.prepare(sql));
  }
  return stmtCache.get(sql);
}

// Call after schema migrations or when dbConnection is replaced so stale
// statements (which reference the old connection) are not reused.
function clearStmtCache() {
  stmtCache.clear();
}

// ─── Postgres → SQLite Parameter Adapter ─────────────────────────────────────
//
// Converts $1/$2/... positional params to SQLite's ? style and builds the
// corresponding positional param array. Extracted into a helper so both
// pool.query and pool.iterate share the same conversion logic.

function convertParams(sql, params = []) {
  const newParams = [];
  const sqliteSql = sql.replace(/\$(\d+)/g, (_, n) => {
    newParams.push(params[parseInt(n, 10) - 1]);
    return "?";
  });
  return { sqliteSql, newParams };
}

// ─── Pool (PG-compatible interface over better-sqlite3) ───────────────────────

const pool = {
  /**
   * Execute a SQL statement, returning a PG-style result object.
   * All SELECT-like statements return { rows }.
   * All mutating statements return { rows: [], rowCount, lastInsertRowid }.
   */
  query: async (sql, params = []) => {
    if (!dbConnection) throw new Error("Database not initialized");

    const { sqliteSql, newParams } = convertParams(sql, params);
    const trimmed = sqliteSql.trim().toUpperCase();
    const isSelect = trimmed.startsWith("SELECT") || sql.includes("RETURNING");

    try {
      const stmt = getStmt(sqliteSql);
      if (isSelect) {
        return { rows: stmt.all(...newParams) };
      } else {
        const info = stmt.run(...newParams);
        return { rows: [], rowCount: info.changes, lastInsertRowid: info.lastInsertRowid };
      }
    } catch (err) {
      logger.error(
        `SQLite query error on [${sqliteSql}] params [${newParams}]:`,
        err.message,
        err.stack
      );
      throw err;
    }
  },

  /**
   * Returns a synchronous better-sqlite3 iterator for the given query.
   * Use this for large result sets (e.g., data export) to avoid loading
   * everything into memory at once.
   */
  iterate: (sql, params = []) => {
    if (!dbConnection) throw new Error("Database not initialized");
    const { sqliteSql, newParams } = convertParams(sql, params);
    return getStmt(sqliteSql).iterate(...newParams);
  },
};

function getPool() {
  return pool;
}

// ─── Migration Runner ─────────────────────────────────────────────────────────

function resolveMigrationPath(filename) {
  return app.isPackaged
    ? path.join(process.resourcesPath, filename)
    : path.join(__dirname, filename);
}

/** Re-read schema version fresh from DB — avoids the stale-variable bug. */
function getSchemaVersion() {
  return (
    dbConnection.prepare("SELECT version FROM schema_version").get()?.version ?? 0
  );
}

/**
 * Read a SQL file, run it in a transaction with an optional seed function,
 * then clear the statement cache so stale compiled statements are not reused
 * against the new schema.
 */
function runMigrationFile(filename, seedFn) {
  const migrationPath = resolveMigrationPath(filename);
  logger.info(`Applying migration file: ${migrationPath}`);
  const sql = fs.readFileSync(migrationPath, "utf8");
  dbConnection.transaction(() => {
    dbConnection.exec(sql);
    if (seedFn) seedFn();
  })();
  clearStmtCache(); // schema changed — discard stale compiled statements
}

/**
 * Sequential migration runner.
 *
 * IMPORTANT: getSchemaVersion() is called fresh inside each `if` block so the
 * version read is always up-to-date. The original code read version once into a
 * local variable and reused it, meaning a brand-new install would attempt every
 * migration regardless of whether the previous one had already bumped the version.
 */
function applyMigrations() {
  // Ensure the version table exists before we query it
  dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    )
  `);

  // ─── v1: Initial schema (sessions, app_categories, settings) ──────────────
  if (getSchemaVersion() < 1) {
    runMigrationFile("migrations.sql", () => {
      const insertSetting = dbConnection.prepare(
        "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
      );
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        insertSetting.run(key, value);
      }

      const insertCategory = dbConnection.prepare(
        "INSERT OR IGNORE INTO app_categories (app_name, category) VALUES (?, ?)"
      );
      for (const [appName, category] of Object.entries(DEFAULT_CATEGORIES)) {
        insertCategory.run(appName, category);
      }

      dbConnection
        .prepare("INSERT OR REPLACE INTO schema_version (version) VALUES (1)")
        .run();
    });
    logger.info("Migration v1 complete.");
  }

  // ─── v2: Focus session support ────────────────────────────────────────────
  if (getSchemaVersion() < 2) {
    // Guard against partial states: if the column already exists (e.g. the
    // app was previously migrated manually), skip the ALTER TABLE but still
    // bump the version.
    const existingCols = dbConnection.pragma("table_info(app_categories)");
    if (existingCols.some((c) => c.name === "is_distracting")) {
      dbConnection
        .prepare("INSERT OR REPLACE INTO schema_version (version) VALUES (2)")
        .run();
    } else {
      runMigrationFile("migration_v2.sql", () => {
        dbConnection
          .prepare("INSERT OR REPLACE INTO schema_version (version) VALUES (2)")
          .run();
      });
    }
    logger.info("Migration v2 complete.");
  }

  // ─── v3: date_local generated column + compound index ─────────────────────
  if (getSchemaVersion() < 3) {
    const existingCols = dbConnection.pragma("table_info(sessions)");
    if (existingCols.some((c) => c.name === "date_local")) {
      dbConnection
        .prepare("INSERT OR REPLACE INTO schema_version (version) VALUES (3)")
        .run();
    } else {
      runMigrationFile("migration_v3.sql", () => {
        dbConnection
          .prepare("INSERT OR REPLACE INTO schema_version (version) VALUES (3)")
          .run();
      });
    }
    logger.info("Migration v3 complete.");
  }
}

// ─── Database Initialisation ──────────────────────────────────────────────────

async function initDatabase() {
  const dbDir = getAppConfigDir();
  fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "screen_time.db");

  logger.info(`Initializing SQLite database at: ${dbPath}`);

  try {
    dbConnection = new Database(dbPath);

    const check = dbConnection.prepare("PRAGMA integrity_check").get();
    if (!check || check.integrity_check !== "ok") {
      logger.error("Database integrity check failed — file is corrupted.");
      throw new Error("Corrupted database");
    }

    dbConnection.pragma("journal_mode = WAL");
  } catch (err) {
    logger.error("Failed to open database, attempting recovery:", err.message);
    if (dbConnection) {
      try { dbConnection.close(); } catch {}
      dbConnection = null;
    }

    try {
      const backupPath = `${dbPath}.corrupted-${Date.now()}`;
      if (fs.existsSync(dbPath)) {
        fs.renameSync(dbPath, backupPath);
        logger.info(`Corrupted DB backed up to: ${backupPath}`);
      }
      dbConnection = new Database(dbPath);
      dbConnection.pragma("journal_mode = WAL");
    } catch (recreateErr) {
      logger.error(
        "Critical: Failed to recreate fresh database:",
        recreateErr.message,
        recreateErr.stack
      );
      throw recreateErr;
    }
  }

  // Clear any stale cache from a previous init (recovery path creates a new
  // connection, so old compiled statements are invalid).
  clearStmtCache();

  applyMigrations();

  return pool;
}

// ─── Settings Helpers ─────────────────────────────────────────────────────────

function getSetting(key) {
  const row = getStmt("SELECT value FROM settings WHERE key = ?").get(key);
  return row?.value ?? DEFAULT_SETTINGS[key];
}

function setSetting(key, value) {
  getStmt(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

async function purgeOldSessions() {
  const retentionDays = getSetting("data_retention_days");
  if (retentionDays === "never") return;

  const days = parseInt(retentionDays, 10);
  if (isNaN(days) || days <= 0) return;

  getStmt(
    "DELETE FROM sessions WHERE datetime(start_time) < datetime('now', '-' || ? || ' days')"
  ).run(days);
}

async function closeDatabase() {
  if (dbConnection) {
    clearStmtCache();
    dbConnection.close();
    dbConnection = null;
  }
}

function getAllSettings() {
  const rows = getStmt("SELECT key, value FROM settings").all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

module.exports = {
  ...require("../configs"),
  getPool,
  initDatabase,
  getSetting,
  setSetting,
  getAllSettings,
  purgeOldSessions,
  closeDatabase,
};
