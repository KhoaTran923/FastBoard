import { UserRepository } from '../repositories/user.repository.js';
import type { User } from '../types/index.js';

export const UserService = {
  /** Search users by (partial) email — used to add project members. */
  async search(term: string): Promise<User[]> {
    const trimmed = term.trim();
    if (trimmed.length < 1) return [];
    return UserRepository.searchByEmail(trimmed);
  },
};
