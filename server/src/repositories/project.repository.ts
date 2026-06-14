import { pool } from '../db/pool.js';
import type { Project, ProjectMember } from '../types/index.js';

export const ProjectRepository = {
  async findAllByUser(userId: string): Promise<Project[]> {
    const { rows } = await pool.query<Project>(
      `SELECT p.* FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId],
    );
    return rows;
  },

  async findById(id: string): Promise<Project | null> {
    const { rows } = await pool.query<Project>('SELECT * FROM projects WHERE id = $1', [id]);
    return rows[0] ?? null;
  },

  async create(data: { name: string; description?: string; owner_id: string }): Promise<Project> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<Project>(
        `INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *`,
        [data.name, data.description ?? null, data.owner_id],
      );
      const project = rows[0];
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'admin')`,
        [project.id, data.owner_id],
      );
      await client.query('COMMIT');
      return project;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id: string, data: { name?: string; description?: string }): Promise<Project | null> {
    const { rows } = await pool.query<Project>(
      `UPDATE projects SET
         name        = COALESCE($1, name),
         description = COALESCE($2, description)
       WHERE id = $3 RETURNING *`,
      [data.name ?? null, data.description ?? null, id],
    );
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  },

  async getMemberRole(projectId: string, userId: string): Promise<ProjectMember['role'] | null> {
    const { rows } = await pool.query<{ role: ProjectMember['role'] }>(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId],
    );
    return rows[0]?.role ?? null;
  },

  async addMember(projectId: string, userId: string, role: ProjectMember['role']): Promise<void> {
    await pool.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3`,
      [projectId, userId, role],
    );
  },

  async removeMember(projectId: string, userId: string): Promise<void> {
    await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId],
    );
  },

  async getMembers(projectId: string) {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.avatar_url, pm.role, pm.joined_at
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at ASC`,
      [projectId],
    );
    return rows;
  },
};
