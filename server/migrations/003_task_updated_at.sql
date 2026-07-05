-- Every task mutation bumps updated_at so clients can resolve concurrent
-- edits with last-write-wins.
-- Run: pnpm migrate

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Backfill existing rows from their creation time
UPDATE tasks SET updated_at = created_at WHERE created_at IS NOT NULL;
