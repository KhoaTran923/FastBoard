import api from '../lib/api';
import type { ApiResponse, AuthResponse, User } from '../types';

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function registerRequest(input: RegisterInput): Promise<AuthResponse> {
  const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/register', input);
  return data.data as AuthResponse;
}

export async function loginRequest(input: LoginInput): Promise<AuthResponse> {
  const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/login', input);
  return data.data as AuthResponse;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<ApiResponse<User>>('/auth/me');
  return data.data as User;
}
