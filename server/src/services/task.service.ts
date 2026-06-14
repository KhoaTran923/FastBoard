import { TaskRepository } from '../repositories/task.repository.js';
import { BoardRepository } from '../repositories/board.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { query } from '../db/pool.js';
import type { CreateTaskInput, UpdateTaskInput } from '../schemas/task.schema.js';

async function getProjectIdFromColumn(columnId: string): Promise<string> {
  const [col] = await query<{ board_id: string }>(
    'SELECT board_id FROM columns WHERE id = $1',
    [columnId]
  );
  if (!col) throw new Error('Column not found');
  const board = await BoardRepository.findById(col.board_id);
  if (!board) throw new Error('Board not found');
  return board.project_id;
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
    return TaskRepository.create(columnId, data);
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
    return TaskRepository.update(taskId, data);
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
    return TaskRepository.move(taskId, columnId, position);
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
  },
};
