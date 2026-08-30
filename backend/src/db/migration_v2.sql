-- Migration v2: Focus session support
-- Extracted from inline JS — all schema changes now live in SQL files.

-- Add distraction flag to app_categories
ALTER TABLE app_categories ADD COLUMN is_distracting INTEGER NOT NULL DEFAULT 0;

-- Focus sessions tracking table
CREATE TABLE IF NOT EXISTS focus_sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  start_time       TEXT    NOT NULL,
  end_time         TEXT,
  duration_minutes INTEGER NOT NULL,
  completed        INTEGER NOT NULL DEFAULT 0,
  distractions     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_start_time ON focus_sessions(start_time);

-- Default focus session settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('focus_session_duration_minutes', '25');
INSERT OR IGNORE INTO settings (key, value) VALUES ('focus_session_break_minutes',    '5');
INSERT OR IGNORE INTO settings (key, value) VALUES ('focus_session_block_mode',       'overlay');
