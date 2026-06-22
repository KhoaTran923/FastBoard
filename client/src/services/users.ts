import api from './http';
import type { ApiResponse, User } from '../types';

/** Search users by (partial) email — used to add project members. */
export async function searchUsers(q: string): Promise<User[]> {
  const { data } = await api.get<ApiResponse<User[]>>('/users', { params: { q } });
  return data.data ?? [];
}
