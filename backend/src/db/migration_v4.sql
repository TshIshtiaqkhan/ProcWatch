-- ─── Migration v4: Daily App Usage Limits ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_name TEXT NOT NULL UNIQUE,
    limit_minutes INTEGER NOT NULL,
    warn_at_percent INTEGER NOT NULL DEFAULT 80,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_limits_app_name ON app_limits(app_name);
