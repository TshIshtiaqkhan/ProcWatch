-- Migration v3: date_local generated column + compound index
--
-- Problem: All hot queries used date(start_time, 'localtime') = ?
-- SQLite cannot use a B-tree index on a function-wrapped column, so the
-- existing idx_sessions_start_time index was silently bypassed on every query.
--
-- Fix: Add a STORED generated column that SQLite computes once at insert time
-- and persists on disk. STORED columns can be indexed directly.
-- The compound (date_local, is_idle) index covers the most common query pattern:
--   WHERE date_local = ? AND is_idle = 0

ALTER TABLE sessions
  ADD COLUMN date_local TEXT
  GENERATED ALWAYS AS (date(start_time, 'localtime')) STORED;

CREATE INDEX IF NOT EXISTS idx_sessions_date_local_idle ON sessions(date_local, is_idle);
