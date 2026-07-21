import { TaskRepository } from '../repositories/task.repository.js';
import { BoardRepository } from '../repositories/board.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { ActivityService } from './activity.service.js';
import { NotificationService } from './notification.service.js';
import { query } from '../db/pool.js';
import type { CreateTaskInput, UpdateTaskInput } from '../schemas/task.schema.js';

async function getProjectIdFromColumn(columnId: string): Promise<string> {
  const [col] = await query<{ board_id: string }>('SELECT board_id FROM columns WHERE id = $1', [
    columnId,
  ]);
  if (!col) throw new Error('Column not found');
  const board = await BoardRepository.findById(col.board_id);
  if (!board) throw new Error('Board not found');
  return board.project_id;
}

async function getColumnNames(ids: string[]): Promise<Map<string, string>> {
  const rows = await query<{ id: string; name: string }>(
    'SELECT id, name FROM columns WHERE id = ANY($1)',
    [ids]
  );
  return new Map(rows.map((r) => [r.id, r.name]));
}

/** Notify users newly assigned to a task (the actor is filtered out later). */
async function notifyAssigned(
  projectId: string,
  actorId: string,
  taskTitle: string,
  before: string[],
  after: string[] | undefined
): Promise<void> {
  if (!after) return;
  const prev = new Set(before);
  const added = after.filter((id) => !prev.has(id));
  if (added.length > 0) {
    await NotificationService.push(added, actorId, projectId, 'task_assigned', {
      task_title: taskTitle,
    });
  }
}

export const TaskService = {
  async getByColumn(columnId: string, userId: string) {
    const projectId = await getProjectIdFromColumn(columnId);
    const member = await ProjectRepository.getMember(projectId, userId);
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');
    if (!member && project.owner_id !== userId) throw new Error('Access denied');
    return TaskRepository.findByColumn(columnId);
  },

  async create(columnId: string, data: CreateTaskInput, userId: string) {
    const projectId = await getProjectIdFromColumn(columnId);
    const member = await ProjectRepository.getMember(projectId, userId);
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');
    if (!member && project.owner_id !== userId) throw new Error('Access denied');
    if (member?.role === 'viewer') throw new Error('Viewers cannot create tasks');
    const task = await TaskRepository.create(columnId, data);

    await ActivityService.log(projectId, userId, 'task.created', 'task', task.id, {
      title: task.title,
    });
    await notifyAssigned(projectId, userId, task.title, [], data.assignee_ids);
    return task;
  },

  async update(taskId: string, data: UpdateTaskInput, userId: string) {
    const task = await TaskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');
    const projectId = await getProjectIdFromColumn(task.column_id);
    const member = await ProjectRepository.getMember(projectId, userId);
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');
    if (!member && project.owner_id !== userId) throw new Error('Access denied');
    if (member?.role === 'viewer') throw new Error('Viewers cannot update tasks');
    const updated = await TaskRepository.update(taskId, data);

    const action =
      data.completed === true
        ? 'task.completed'
        : data.completed === false
          ? 'task.reopened'
          : 'task.updated';
    await ActivityService.log(projectId, userId, action, 'task', taskId, {
      title: updated?.title ?? task.title,
    });
    await notifyAssigned(
      projectId,
      userId,
      updated?.title ?? task.title,
      task.assignees ?? [],
      data.assignee_ids
    );
    return updated;
  },

  async move(taskId: string, columnId: string, position: number, userId: string) {
    const task = await TaskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');
    const projectId = await getProjectIdFromColumn(task.column_id);
    const member = await ProjectRepository.getMember(projectId, userId);
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');
    if (!member && project.owner_id !== userId) throw new Error('Access denied');
    if (member?.role === 'viewer') throw new Error('Viewers cannot move tasks');
    const moved = await TaskRepository.move(taskId, columnId, position);

    // Only log real column changes, not reorders within a column
    if (task.column_id !== columnId) {
      const names = await getColumnNames([task.column_id, columnId]);
      await ActivityService.log(projectId, userId, 'task.moved', 'task', taskId, {
        title: task.title,
        from: names.get(task.column_id) ?? null,
        to: names.get(columnId) ?? null,
      });
    }
    return moved;
  },

  async delete(taskId: string, userId: string) {
    const task = await TaskRepository.findById(taskId);
    if (!task) throw new Error('Task not found');
    const projectId = await getProjectIdFromColumn(task.column_id);
    const member = await ProjectRepository.getMember(projectId, userId);
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');
    if (!member && project.owner_id !== userId) throw new Error('Access denied');
    if (member?.role === 'viewer') throw new Error('Viewers cannot delete tasks');
    await TaskRepository.delete(taskId);

    await ActivityService.log(projectId, userId, 'task.deleted', 'task', taskId, {
      title: task.title,
    });
  },
};
