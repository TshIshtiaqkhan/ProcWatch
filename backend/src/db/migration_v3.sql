-- Migration v3: date_local column + compound index
--
-- Problem: All hot queries used date(start_time, 'localtime') = ?
-- SQLite cannot use a B-tree index on a function-wrapped column, so the
-- existing idx_sessions_start_time index was silently bypassed on every query.
--
-- Fix: Add a date_local column to sessions, backfill existing records,
-- and index (date_local, is_idle) covering the primary query pattern:
--   WHERE date_local = ? AND is_idle = 0

ALTER TABLE sessions ADD COLUMN date_local TEXT;

UPDATE sessions
SET date_local = date(start_time, 'localtime')
WHERE date_local IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_date_local_idle ON sessions(date_local, is_idle);
