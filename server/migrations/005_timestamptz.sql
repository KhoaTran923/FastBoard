-- The activity feed and notification bell render relative times ("5m ago").
-- TIMESTAMP (no zone) columns written by NOW() on a UTC server read back
-- shifted on clients in other timezones, so convert the columns those UIs
-- read to TIMESTAMPTZ. Existing values were written in UTC.
-- Run: pnpm migrate

ALTER TABLE activity_logs
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE notifications
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN read_at    TYPE TIMESTAMPTZ USING read_at    AT TIME ZONE 'UTC';

ALTER TABLE project_invites
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';

ALTER TABLE project_members
  ALTER COLUMN joined_at  TYPE TIMESTAMPTZ USING joined_at  AT TIME ZONE 'UTC';
