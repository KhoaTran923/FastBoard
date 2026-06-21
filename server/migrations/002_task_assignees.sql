-- Multiple assignees per task (replaces the single tasks.assignee_id).
-- Run: pnpm migrate

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id  UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);

-- Carry over any existing single assignees.
INSERT INTO task_assignees (task_id, user_id)
SELECT id, assignee_id FROM tasks WHERE assignee_id IS NOT NULL
ON CONFLICT DO NOTHING;
