import { query } from '../db/pool.js';
import type { Board, Column } from '../types/index.js';

export const BoardRepository = {
  async findByProject(projectId: string): Promise<Board[]> {
    return query<Board>(
      'SELECT * FROM boards WHERE project_id = $1 ORDER BY position ASC',
      [projectId]
    );
  },

  async findById(id: string): Promise<Board | null> {
    const rows = await query<Board>(
      'SELECT * FROM boards WHERE id = $1 LIMIT 1',
      [id]
    );
    return rows[0] ?? null;
  },

  async create(data: {
    project_id: string;
    name: string;
    position?: number;
  }): Promise<Board> {
    const rows = await query<Board>(
      `INSERT INTO boards (project_id, name, position)
       VALUES ($1, $2, COALESCE($3, (SELECT COALESCE(MAX(position), -1) + 1 FROM boards WHERE project_id = $1)))
       RETURNING *`,
      [data.project_id, data.name, data.position ?? null]
    );
    return rows[0]!;
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM boards WHERE id = $1', [id]);
  },

  // Columns
  async getColumns(boardId: string): Promise<Column[]> {
    return query<Column>(
      'SELECT * FROM columns WHERE board_id = $1 ORDER BY position ASC',
      [boardId]
    );
  },

  async createColumn(data: {
    board_id: string;
    name: string;
    position?: number;
  }): Promise<Column> {
    const rows = await query<Column>(
      `INSERT INTO columns (board_id, name, position)
       VALUES ($1, $2, COALESCE($3, (SELECT COALESCE(MAX(position), -1) + 1 FROM columns WHERE board_id = $1)))
       RETURNING *`,
      [data.board_id, data.name, data.position ?? null]
    );
    return rows[0]!;
  },

  async deleteColumn(id: string): Promise<void> {
    await query('DELETE FROM columns WHERE id = $1', [id]);
  },
};
