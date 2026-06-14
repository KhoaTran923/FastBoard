import { TaskRepository } from '../repositories/task.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { pool } from '../db/pool.js';
import { io } from '../index.js';

async function getProjectIdFromColumn(columnId: string): Promise<string | null> {
  const { rows } = await pool.query(
    'SELECT b.project_id FROM columns c JOIN boards b ON b.id = c.board_id WHERE c.id = $1',
    [columnId],
  );
  return rows[0]?.project_id ?? null;
}

export const TaskService = {
  async getByColumn(columnId: string, userId: string) {
    const projectId = await getProjectIdFromColumn(columnId);
    if (!projectId) throw Object.assign(new Error('Column không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    const role = await ProjectRepository.getMemberRole(projectId, userId);
    if (!role) throw Object.assign(new Error('Không có quyền truy cập'), { code: 'FORBIDDEN', status: 403 });
    return TaskRepository.findByColumn(columnId);
  },

  async create(columnId: string, userId: string, data: {
    title: string; description?: string; priority?: string;
    due_date?: string; assignee_id?: string; position?: number;
  }) {
    const projectId = await getProjectIdFromColumn(columnId);
    if (!projectId) throw Object.assign(new Error('Column không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    const role = await ProjectRepository.getMemberRole(projectId, userId);
    if (!role || role === 'viewer') {
      throw Object.assign(new Error('Không có quyền tạo task'), { code: 'FORBIDDEN', status: 403 });
    }
    const task = await TaskRepository.create({ ...data, column_id: columnId });
    const { rows } = await pool.query(
      'SELECT b.id as board_id FROM columns c JOIN boards b ON b.id = c.board_id WHERE c.id = $1',
      [columnId],
    );
    if (rows[0]) io.to(`board:${rows[0].board_id}`).emit('task:created', { task, boardId: rows[0].board_id });
    return task;
  },

  async update(taskId: string, userId: string, data: object) {
    const task = await TaskRepository.findById(taskId);
    if (!task) throw Object.assign(new Error('Task không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    const projectId = await getProjectIdFromColumn(task.column_id);
    if (!projectId) throw Object.assign(new Error('Lỗi dữ liệu'), { code: 'INTERNAL_ERROR', status: 500 });
    const role = await ProjectRepository.getMemberRole(projectId, userId);
    if (!role || role === 'viewer') {
      throw Object.assign(new Error('Không có quyền chỉnh sửa task'), { code: 'FORBIDDEN', status: 403 });
    }
    const updated = await TaskRepository.update(taskId, data);
    if (updated) {
      const { rows } = await pool.query(
        'SELECT b.id as board_id FROM columns c JOIN boards b ON b.id = c.board_id WHERE c.id = $1',
        [updated.column_id],
      );
      if (rows[0]) io.to(`board:${rows[0].board_id}`).emit('task:updated', { task: updated, boardId: rows[0].board_id });
    }
    return updated;
  },

  async move(taskId: string, userId: string, columnId: string, position: number) {
    const task = await TaskRepository.findById(taskId);
    if (!task) throw Object.assign(new Error('Task không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    const projectId = await getProjectIdFromColumn(task.column_id);
    if (!projectId) throw Object.assign(new Error('Lỗi dữ liệu'), { code: 'INTERNAL_ERROR', status: 500 });
    const role = await ProjectRepository.getMemberRole(projectId, userId);
    if (!role || role === 'viewer') {
      throw Object.assign(new Error('Không có quyền di chuyển task'), { code: 'FORBIDDEN', status: 403 });
    }
    const updated = await TaskRepository.move(taskId, columnId, position);
    if (updated) {
      const { rows } = await pool.query(
        'SELECT b.id as board_id FROM columns c JOIN boards b ON b.id = c.board_id WHERE c.id = $1',
        [columnId],
      );
      if (rows[0]) {
        io.to(`board:${rows[0].board_id}`).emit('task:moved', {
          taskId, fromColumnId: task.column_id, toColumnId: columnId, position, boardId: rows[0].board_id,
        });
      }
    }
    return updated;
  },

  async delete(taskId: string, userId: string): Promise<void> {
    const task = await TaskRepository.findById(taskId);
    if (!task) throw Object.assign(new Error('Task không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    const projectId = await getProjectIdFromColumn(task.column_id);
    if (!projectId) throw Object.assign(new Error('Lỗi dữ liệu'), { code: 'INTERNAL_ERROR', status: 500 });
    const role = await ProjectRepository.getMemberRole(projectId, userId);
    if (role !== 'admin') {
      throw Object.assign(new Error('Chỉ admin mới có thể xóa task'), { code: 'FORBIDDEN', status: 403 });
    }
    const { rows } = await pool.query(
      'SELECT b.id as board_id FROM columns c JOIN boards b ON b.id = c.board_id WHERE c.id = $1',
      [task.column_id],
    );
    await TaskRepository.delete(taskId);
    if (rows[0]) io.to(`board:${rows[0].board_id}`).emit('task:deleted', { taskId, boardId: rows[0].board_id });
  },
};
