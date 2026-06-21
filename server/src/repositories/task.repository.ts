import pool, { query } from '../db/pool.js';
import type { Task } from '../types/index.js';
import type { CreateTaskInput, UpdateTaskInput } from '../schemas/task.schema.js';

export const TaskRepository = {
  async findByColumn(columnId: string): Promise<Task[]> {
    return query<Task>('SELECT * FROM tasks WHERE column_id = $1 ORDER BY position ASC', [
      columnId,
    ]);
  },

  async findById(id: string): Promise<Task | null> {
    const rows = await query<Task>('SELECT * FROM tasks WHERE id = $1 LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  async create(columnId: string, data: CreateTaskInput): Promise<Task> {
    const rows = await query<Task>(
      `INSERT INTO tasks (column_id, title, description, priority, due_date, assignee_id, position)
       VALUES ($1, $2, $3, $4, $5, $6,
         COALESCE($7, (SELECT COALESCE(MAX(position), -1) + 1 FROM tasks WHERE column_id = $1)))
       RETURNING *`,
      [
        columnId,
        data.title,
        data.description ?? null,
        data.priority ?? null,
        data.due_date ?? null,
        data.assignee_id ?? null,
        data.position ?? null,
      ]
    );
    return rows[0]!;
  },

  async update(id: string, data: UpdateTaskInput): Promise<Task | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    const assign = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    if (data.column_id !== undefined) assign('column_id', data.column_id);
    if (data.title !== undefined) assign('title', data.title);
    if (data.description !== undefined) assign('description', data.description);
    if (data.priority !== undefined) assign('priority', data.priority);
    if (data.due_date !== undefined) assign('due_date', data.due_date);
    if (data.assignee_id !== undefined) assign('assignee_id', data.assignee_id);
    if (data.position !== undefined) assign('position', data.position);

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const rows = await query<Task>(
      `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  },

  async move(id: string, columnId: string, position: number): Promise<Task | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Shift other tasks in target column to make room
      await client.query(
        `UPDATE tasks SET position = position + 1
         WHERE column_id = $1 AND position >= $2 AND id != $3`,
        [columnId, position, id]
      );
      const { rows } = await client.query<Task>(
        `UPDATE tasks SET column_id = $1, position = $2
         WHERE id = $3
         RETURNING *`,
        [columnId, position, id]
      );
      await client.query('COMMIT');
      return rows[0] ?? null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM tasks WHERE id = $1', [id]);
  },
};
