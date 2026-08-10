-- Week 11: composite indexes matching the hot query shapes, replacing the
-- single-column indexes they supersede (the composite covers the same
-- lookups plus the ORDER BY, so keeping both would only slow writes).
-- Run: pnpm migrate

-- Tasks are always listed per column ordered by position
CREATE INDEX IF NOT EXISTS idx_tasks_column_position ON tasks(column_id, position);
DROP INDEX IF EXISTS idx_tasks_column_id;

-- Boards and columns are listed per parent ordered by position
CREATE INDEX IF NOT EXISTS idx_boards_project_position ON boards(project_id, position);
DROP INDEX IF EXISTS idx_boards_project_id;

CREATE INDEX IF NOT EXISTS idx_columns_board_position ON columns(board_id, position);
DROP INDEX IF EXISTS idx_columns_board_id;

-- Activity feed pages newest-first with a created_at cursor
CREATE INDEX IF NOT EXISTS idx_activity_project_created
  ON activity_logs(project_id, created_at DESC);
DROP INDEX IF EXISTS idx_activity_project_id;

-- Assignee diffing on task updates reads by user as well as by task
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);
