// Shared TypeScript interfaces

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Express.Request {
  user?: JwtPayload;
}

// Express Request with user attached. Route params are pinned to flat strings
// because Express 5 types them as string | string[] by default.
import type { Request } from 'express';
export interface AuthenticatedRequest extends Request<Record<string, string>> {
  user: JwtPayload;
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Domain types
export type UserRole = 'admin' | 'member' | 'viewer';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: Date;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: UserRole;
  joined_at: Date;
}

export interface Board {
  id: string;
  project_id: string;
  name: string;
  position: number;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
}

export interface Task {
  id: string;
  column_id: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: Date;
  /** @deprecated single assignee — superseded by the `assignees` array. */
  assignee_id?: string;
  /** User ids assigned to this task (from the task_assignees join table). */
  assignees?: string[];
  position: number;
  completed_at?: Date;
  created_at: Date;
  /** Bumped on every mutation; used for last-write-wins sync. */
  updated_at: Date;
}

export interface ActivityLog {
  id: string;
  project_id: string;
  /** Null when the acting user account was deleted. */
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}
