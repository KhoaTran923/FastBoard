import { query } from '../db/pool.js';
import type { ActivityLog } from '../types/index.js';

/** Activity row joined with the acting user's display info. */
export interface ActivityEntry extends ActivityLog {
  user_name: string | null;
  user_email: string | null;
}

export const ActivityRepository = {
  async insert(data: {
    project_id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await query(
      `INSERT INTO activity_logs (project_id, user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        data.project_id,
        data.user_id,
        data.action,
        data.entity_type,
        data.entity_id,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
  },

  /** Newest-first page of a project's activity; `before` paginates backwards. */
  async listByProject(projectId: string, limit: number, before?: Date) {
    return query<ActivityEntry>(
      `SELECT a.*, u.full_name AS user_name, u.email AS user_email
       FROM activity_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.project_id = $1 AND ($2::timestamp IS NULL OR a.created_at < $2)
       ORDER BY a.created_at DESC
       LIMIT $3`,
      [projectId, before ?? null, limit]
    );
  },
};
