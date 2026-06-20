import api from '../lib/api';
import type { ApiResponse, Board, Column, Project, Task } from '../types';

// ── Projects ──────────────────────────────────────────────────────────────────
export async function getProjects(): Promise<Project[]> {
  const { data } = await api.get<ApiResponse<Project[]>>('/projects');
  return data.data ?? [];
}

export async function createProject(name: string, description?: string): Promise<Project> {
  const { data } = await api.post<ApiResponse<Project>>('/projects', { name, description });
  return data.data as Project;
}

// ── Boards & columns ──────────────────────────────────────────────────────────
/** Returns the project's boards, each already including its columns. */
export async function getBoards(projectId: string): Promise<Board[]> {
  const { data } = await api.get<ApiResponse<Board[]>>(`/projects/${projectId}/boards`);
  return data.data ?? [];
}

export async function createBoard(projectId: string, name: string): Promise<Board> {
  const { data } = await api.post<ApiResponse<Board>>(`/projects/${projectId}/boards`, { name });
  return data.data as Board;
}

export async function createColumn(
  projectId: string,
  boardId: string,
  name: string
): Promise<Column> {
  const { data } = await api.post<ApiResponse<Column>>(
    `/projects/${projectId}/boards/${boardId}/columns`,
    { name }
  );
  return data.data as Column;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export async function getColumnTasks(
  projectId: string,
  boardId: string,
  columnId: string
): Promise<Task[]> {
  const { data } = await api.get<ApiResponse<Task[]>>(
    `/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`
  );
  return data.data ?? [];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Task['priority'];
}

export async function createTask(
  projectId: string,
  boardId: string,
  columnId: string,
  input: CreateTaskInput
): Promise<Task> {
  const { data } = await api.post<ApiResponse<Task>>(
    `/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`,
    input
  );
  return data.data as Task;
}
