import { query } from '../db/pool.js';
import type { Project, ProjectMember, UserRole } from '../types/index.js';

export const ProjectRepository = {
  async findAllByUser(userId: string): Promise<Project[]> {
    return query<Project>(
      `SELECT p.* FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       WHERE p.owner_id = $1 OR pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );
  },

  async findById(id: string): Promise<Project | null> {
    const rows = await query<Project>('SELECT * FROM projects WHERE id = $1 LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  async create(data: { name: string; description?: string; owner_id: string }): Promise<Project> {
    const rows = await query<Project>(
      `INSERT INTO projects (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.name, data.description ?? null, data.owner_id]
    );
    return rows[0]!;
  },

  async update(id: string, data: { name?: string; description?: string }): Promise<Project | null> {
    const rows = await query<Project>(
      `UPDATE projects SET
         name = COALESCE($1, name),
         description = COALESCE($2, description)
       WHERE id = $3
       RETURNING *`,
      [data.name ?? null, data.description ?? null, id]
    );
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM projects WHERE id = $1', [id]);
  },

  async getMember(projectId: string, userId: string): Promise<ProjectMember | null> {
    const rows = await query<ProjectMember>(
      'SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1',
      [projectId, userId]
    );
    return rows[0] ?? null;
  },

  async addMember(projectId: string, userId: string, role: UserRole): Promise<ProjectMember> {
    const rows = await query<ProjectMember>(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3
       RETURNING *`,
      [projectId, userId, role]
    );
    return rows[0]!;
  },

  async removeMember(projectId: string, userId: string): Promise<void> {
    await query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [
      projectId,
      userId,
    ]);
  },

  async getMembers(projectId: string) {
    return query(
      `SELECT u.id, u.email, u.full_name, u.avatar_url, pm.role, pm.joined_at
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at ASC`,
      [projectId]
    );
  },
};
