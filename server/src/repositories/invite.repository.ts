import { query } from '../db/pool.js';
import type { UserRole } from '../types/index.js';

export interface ProjectInvite {
  token: string;
  project_id: string;
  role: UserRole;
  created_by: string | null;
  expires_at: Date;
  created_at: Date;
}

/** Invite joined with display info for the accept page. */
export interface InviteDetail extends ProjectInvite {
  project_name: string;
  inviter_name: string | null;
}

export const InviteRepository = {
  async create(projectId: string, role: UserRole, createdBy: string, expiresAt: Date) {
    const rows = await query<ProjectInvite>(
      `INSERT INTO project_invites (project_id, role, created_by, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [projectId, role, createdBy, expiresAt]
    );
    return rows[0]!;
  },

  async findByToken(token: string): Promise<InviteDetail | null> {
    const rows = await query<InviteDetail>(
      `SELECT i.*, p.name AS project_name, u.full_name AS inviter_name
       FROM project_invites i
       JOIN projects p ON p.id = i.project_id
       LEFT JOIN users u ON u.id = i.created_by
       WHERE i.token = $1
       LIMIT 1`,
      [token]
    );
    return rows[0] ?? null;
  },

  async findByProject(projectId: string): Promise<ProjectInvite[]> {
    return query<ProjectInvite>(
      `SELECT * FROM project_invites
       WHERE project_id = $1 AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [projectId]
    );
  },

  async delete(token: string): Promise<void> {
    await query('DELETE FROM project_invites WHERE token = $1', [token]);
  },
};
