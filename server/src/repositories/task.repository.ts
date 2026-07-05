import pool, { query } from '../db/pool.js';
import type { Task } from '../types/index.js';
import type { CreateTaskInput, UpdateTaskInput } from '../schemas/task.schema.js';

const SELECT_TASK = `
  SELECT t.*,
         COALESCE(ARRAY_AGG(ta.user_id) FILTER (WHERE ta.user_id IS NOT NULL), '{}') AS assignees
  FROM tasks t
  LEFT JOIN task_assignees ta ON ta.task_id = t.id`;

export const TaskRepository = {
  async findByColumn(columnId: string): Promise<Task[]> {
    return query<Task>(
      `${SELECT_TASK} WHERE t.column_id = $1 GROUP BY t.id ORDER BY t.position ASC`,
      [columnId]
    );
  },

  async findById(id: string): Promise<Task | null> {
    const rows = await query<Task>(`${SELECT_TASK} WHERE t.id = $1 GROUP BY t.id LIMIT 1`, [id]);
    return rows[0] ?? null;
  },

  /** Replace a task's assignees with the given set of user ids. */
  async setAssignees(taskId: string, userIds: string[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM task_assignees WHERE task_id = $1', [taskId]);
      for (const userId of userIds) {
        await client.query(
          'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [taskId, userId]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async create(columnId: string, data: CreateTaskInput): Promise<Task> {
    const rows = await query<{ id: string }>(
      `INSERT INTO tasks (column_id, title, description, priority, due_date, position)
       VALUES ($1, $2, $3, $4, $5,
         COALESCE($6, (SELECT COALESCE(MAX(position), -1) + 1 FROM tasks WHERE column_id = $1)))
       RETURNING id`,
      [
        columnId,
        data.title,
        data.description ?? null,
        data.priority ?? null,
        data.due_date ?? null,
        data.position ?? null,
      ]
    );
    const id = rows[0]!.id;
    if (data.assignee_ids?.length) await this.setAssignees(id, data.assignee_ids);
    return (await this.findById(id))!;
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
    if (data.position !== undefined) assign('position', data.position);
    // completed toggles the completion timestamp
    if (data.completed !== undefined)
      sets.push(`completed_at = ${data.completed ? 'NOW()' : 'NULL'}`);

    if (sets.length > 0) {
      sets.push('updated_at = NOW()');
      values.push(id);
      await query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
    }
    if (data.assignee_ids !== undefined) await this.setAssignees(id, data.assignee_ids);

    return this.findById(id);
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
        `UPDATE tasks SET column_id = $1, position = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id`,
        [columnId, position, id]
      );
      await client.query('COMMIT');
      // Re-select via findById so the broadcast task includes assignees
      return rows[0] ? this.findById(id) : null;
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
