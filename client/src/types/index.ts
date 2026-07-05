// Shared types — mirror the server's domain model

export type UserRole = 'admin' | 'member' | 'viewer';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  created_at: string;
}

export interface Task {
  id: string;
  column_id: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority | null;
  due_date?: string | null;
  assignees: string[];
  position: number;
  completed_at?: string | null;
  created_at: string;
  /** Bumped by the server on every mutation; used for last-write-wins sync. */
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
}

export interface Board {
  id: string;
  project_id: string;
  name: string;
  position: number;
  columns?: Column[];
}

/** A column with its tasks loaded (used by the active board view). */
export interface ColumnWithTasks extends Column {
  tasks: Task[];
}

/** A board with its columns and their tasks loaded. */
export interface BoardDetail extends Board {
  columns: ColumnWithTasks[];
}

/** A project member, as returned by GET /projects/:id/members (user + role). */
export interface Member {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: UserRole;
  joined_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: { field: string; message: string }[];
}

// Realtime event payloads broadcast by the socket server

export interface TaskEventPayload {
  task: Task;
  /** User who made the change. */
  actorId: string;
}

export interface TaskMovedPayload extends TaskEventPayload {
  fromColumnId: string;
}

export interface TaskDeletedPayload {
  taskId: string;
  columnId: string;
  actorId: string;
}
