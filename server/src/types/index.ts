export interface User {
  id: string;
  email: string;
  password: string;
  full_name: string;
  avatar_url: string | null;
  created_at: Date;
}

export type UserPublic = Omit<User, 'password'>;

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: Date;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
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
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  due_date: string | null;
  assignee_id: string | null;
  position: number;
  completed_at: Date | null;
  created_at: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
