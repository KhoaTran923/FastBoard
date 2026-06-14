import { pool } from '../db/pool.js';
import type { Board, Column } from '../types/index.js';

export const BoardRepository = {
  async findByProject(projectId: string): Promise<Board[]> {
    const { rows } = await pool.query<Board>(
      'SELECT * FROM boards WHERE project_id = $1 ORDER BY position ASC',
      [projectId],
    );
    return rows;
  },

  async findById(id: string): Promise<Board | null> {
    const { rows } = await pool.query<Board>('SELECT * FROM boards WHERE id = $1', [id]);
    return rows[0] ?? null;
  },

  async create(data: { project_id: string; name: string; position?: number }): Promise<Board> {
    const { rows } = await pool.query<Board>(
      `INSERT INTO boards (project_id, name, position) VALUES ($1, $2, $3) RETURNING *`,
      [data.project_id, data.name, data.position ?? 0],
    );
    return rows[0];
  },

  async update(id: string, data: { name?: string; position?: number }): Promise<Board | null> {
    const { rows } = await pool.query<Board>(
      `UPDATE boards SET
         name     = COALESCE($1, name),
         position = COALESCE($2, position)
       WHERE id = $3 RETURNING *`,
      [data.name ?? null, data.position ?? null, id],
    );
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM boards WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  },

  async getColumns(boardId: string): Promise<Column[]> {
    const { rows } = await pool.query<Column>(
      'SELECT * FROM columns WHERE board_id = $1 ORDER BY position ASC',
      [boardId],
    );
    return rows;
  },

  async createColumn(data: { board_id: string; name: string; position?: number }): Promise<Column> {
    const { rows } = await pool.query<Column>(
      `INSERT INTO columns (board_id, name, position) VALUES ($1, $2, $3) RETURNING *`,
      [data.board_id, data.name, data.position ?? 0],
    );
    return rows[0];
  },

  async updateColumn(id: string, data: { name?: string; position?: number }): Promise<Column | null> {
    const { rows } = await pool.query<Column>(
      `UPDATE columns SET
         name     = COALESCE($1, name),
         position = COALESCE($2, position)
       WHERE id = $3 RETURNING *`,
      [data.name ?? null, data.position ?? null, id],
    );
    return rows[0] ?? null;
  },

  async deleteColumn(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM columns WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  },
};
