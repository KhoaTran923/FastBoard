import { query } from '../db/pool.js';
import type { User } from '../types/index.js';

export const UserRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const rows = await query<User & { password: string }>(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const rows = await query<User>(
      'SELECT id, email, full_name, avatar_url, created_at FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    return rows[0] ?? null;
  },

  async create(data: { email: string; password: string; full_name: string }): Promise<User> {
    const rows = await query<User>(
      `INSERT INTO users (email, password, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, avatar_url, created_at`,
      [data.email, data.password, data.full_name]
    );
    return rows[0]!;
  },

  async findByEmailWithPassword(email: string): Promise<(User & { password: string }) | null> {
    const rows = await query<User & { password: string }>(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    return rows[0] ?? null;
  },
};
