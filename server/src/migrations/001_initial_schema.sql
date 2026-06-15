-- FastBoard Initial Schema
-- Run: psql $DATABASE_URL -f src/migrations/001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  full_name   VARCHAR(255) NOT NULL,
  avatar_url  VARCHAR(500),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) CHECK (role IN ('admin', 'member', 'viewer')) NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS boards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS columns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    UUID REFERENCES boards(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id    UUID REFERENCES columns(id) ON DELETE CASCADE,
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  priority     VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date     DATE,
  assignee_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  position     INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id),
  action       VARCHAR(50) NOT NULL,
  entity_type  VARCHAR(50) NOT NULL,
  entity_id    UUID NOT NULL,
  metadata     JSONB,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_column_id       ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id     ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_activity_project_id   ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_boards_project_id     ON boards(project_id);
CREATE INDEX IF NOT EXISTS idx_columns_board_id      ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user  ON project_members(user_id);
