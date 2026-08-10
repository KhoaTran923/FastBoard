-- Deleting a user was impossible once they had activity in another user's
-- project: activity_logs.user_id had no ON DELETE action. History should
-- outlive the account, so the actor becomes NULL instead (the UI already
-- renders a missing actor as "Someone").
-- Run: pnpm migrate

ALTER TABLE activity_logs
  DROP CONSTRAINT activity_logs_user_id_fkey;

ALTER TABLE activity_logs
  ADD CONSTRAINT activity_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
