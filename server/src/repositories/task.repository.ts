import { pool } from '../db/pool.js';
import type { Task } from '../types/index.js';

export const TaskRepository = {
  async findByColumn(columnId: string): Promise<Task[]> {
    const { rows } = await pool.query<Task>(
      'SELECT * FROM tasks WHERE column_id = $1 ORDER BY position ASC',
      [columnId],
    );
    return rows;
  },

  async findById(id: string): Promise<Task | null> {
    const { rows } = await pool.query<Task>('SELECT * FROM tasks WHERE id = $1', [id]);
    return rows[0] ?? null;
  },

  async create(data: {
    column_id: string; title: string; description?: string;
    priority?: string; due_date?: string; assignee_id?: string; position?: number;
  }): Promise<Task> {
    const { rows } = await pool.query<Task>(
      `INSERT INTO tasks (column_id, title, description, priority, due_date, assignee_id, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.column_id, data.title, data.description ?? null, data.priority ?? null,
       data.due_date ?? null, data.assignee_id ?? null, data.position ?? 0],
    );
    return rows[0];
  },

  async update(id: string, data: Partial<{
    title: string; description: string; priority: string;
    due_date: string; assignee_id: string; position: number; completed_at: Date | null;
  }>): Promise<Task | null> {
    const { rows } = await pool.query<Task>(
      `UPDATE tasks SET
         title        = COALESCE($1, title),
         description  = COALESCE($2, description),
         priority     = COALESCE($3, priority),
         due_date     = COALESCE($4, due_date),
         assignee_id  = COALESCE($5, assignee_id),
         position     = COALESCE($6, position),
         completed_at = COALESCE($7, completed_at)
       WHERE id = $8 RETURNING *`,
      [data.title ?? null, data.description ?? null, data.priority ?? null,
       data.due_date ?? null, data.assignee_id ?? null, data.position ?? null,
       data.completed_at ?? null, id],
    );
    return rows[0] ?? null;
  },

  async move(id: string, columnId: string, position: number): Promise<Task | null> {
    const { rows } = await pool.query<Task>(
      `UPDATE tasks SET column_id = $1, position = $2 WHERE id = $3 RETURNING *`,
      [columnId, position, id],
    );
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  },
};
