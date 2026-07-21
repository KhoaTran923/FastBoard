import { query } from '../db/pool.js';

export interface NotificationRow {
  id: string;
  user_id: string;
  actor_id: string | null;
  project_id: string | null;
  type: string;
  metadata: Record<string, unknown> | null;
  read_at: Date | null;
  created_at: Date;
}

/** Notification joined with actor/project display info. */
export interface NotificationEntry extends NotificationRow {
  actor_name: string | null;
  project_name: string | null;
}

export const NotificationRepository = {
  async insert(data: {
    user_id: string;
    actor_id: string;
    project_id: string;
    type: string;
    metadata?: Record<string, unknown>;
  }): Promise<NotificationRow> {
    const rows = await query<NotificationRow>(
      `INSERT INTO notifications (user_id, actor_id, project_id, type, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.user_id,
        data.actor_id,
        data.project_id,
        data.type,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
    return rows[0]!;
  },

  async listByUser(userId: string, limit: number): Promise<NotificationEntry[]> {
    return query<NotificationEntry>(
      `SELECT n.*, u.full_name AS actor_name, p.name AS project_name
       FROM notifications n
       LEFT JOIN users u ON u.id = n.actor_id
       LEFT JOIN projects p ON p.id = n.project_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
  },

  async unreadCount(userId: string): Promise<number> {
    const rows = await query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [userId]
    );
    return Number(rows[0]?.count ?? 0);
  },

  /** Marks one notification read; scoped to the owner so ids cannot be guessed. */
  async markRead(id: string, userId: string): Promise<boolean> {
    const rows = await query<{ id: string }>(
      `UPDATE notifications SET read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND read_at IS NULL
       RETURNING id`,
      [id, userId]
    );
    return rows.length > 0;
  },

  async markAllRead(userId: string): Promise<void> {
    await query('UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL', [
      userId,
    ]);
  },
};
