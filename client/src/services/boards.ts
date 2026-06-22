import api from './http';
import type { ApiResponse, Board, Column, Member, Project, Task, UserRole } from '../types';

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

export async function renameBoard(
  projectId: string,
  boardId: string,
  name: string
): Promise<Board> {
  const { data } = await api.patch<ApiResponse<Board>>(`/projects/${projectId}/boards/${boardId}`, {
    name,
  });
  return data.data as Board;
}

export async function deleteBoard(projectId: string, boardId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/boards/${boardId}`);
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

export async function renameColumn(
  projectId: string,
  boardId: string,
  columnId: string,
  name: string
): Promise<Column> {
  const { data } = await api.patch<ApiResponse<Column>>(
    `/projects/${projectId}/boards/${boardId}/columns/${columnId}`,
    { name }
  );
  return data.data as Column;
}

export async function deleteColumn(
  projectId: string,
  boardId: string,
  columnId: string
): Promise<void> {
  await api.delete(`/projects/${projectId}/boards/${boardId}/columns/${columnId}`);
}

// ── Members ───────────────────────────────────────────────────────────────────
export async function getMembers(projectId: string): Promise<Member[]> {
  const { data } = await api.get<ApiResponse<Member[]>>(`/projects/${projectId}/members`);
  return data.data ?? [];
}

export async function addMember(
  projectId: string,
  userId: string,
  role: UserRole = 'member'
): Promise<void> {
  await api.post(`/projects/${projectId}/members`, { user_id: userId, role });
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
  assignee_ids?: string[];
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

/** Editable task fields; `null` clears a field, omitting it leaves it unchanged. */
export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: Task['priority'] | null;
  due_date?: string | null;
  /** Full set of assignee user ids (replaces the current set). */
  assignee_ids?: string[];
  column_id?: string;
}

export async function updateTask(
  projectId: string,
  boardId: string,
  columnId: string,
  taskId: string,
  patch: UpdateTaskInput
): Promise<Task> {
  const { data } = await api.put<ApiResponse<Task>>(
    `/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}`,
    patch
  );
  return data.data as Task;
}

export async function moveTask(
  projectId: string,
  boardId: string,
  columnId: string,
  taskId: string,
  toColumnId: string,
  position: number
): Promise<Task> {
  const { data } = await api.patch<ApiResponse<Task>>(
    `/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}/move`,
    { column_id: toColumnId, position }
  );
  return data.data as Task;
}

export async function deleteTask(
  projectId: string,
  boardId: string,
  columnId: string,
  taskId: string
): Promise<void> {
  await api.delete(`/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}`);
}
