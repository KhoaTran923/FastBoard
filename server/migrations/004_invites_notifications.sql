-- Week 9: Team & Permission System
-- Shareable invite links and in-app notifications.
-- Run: pnpm migrate

-- A link invite: anyone who opens it (while logged in) joins with `role`.
-- The token itself is the unguessable part of the URL.
CREATE TABLE IF NOT EXISTS project_invites (
  token       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL DEFAULT 'member'
              CHECK (role IN ('admin', 'member', 'viewer')),
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_project_id ON project_invites(project_id);

-- In-app notifications, one row per recipient.
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  metadata    JSONB,
  read_at     TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
-- Partial index keeps the unread-count query cheap
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id)
  WHERE read_at IS NULL;
