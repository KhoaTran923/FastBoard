import { pool } from '../db/pool.js';
import type { User, UserPublic } from '../types/index.js';

export const UserRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email],
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<UserPublic | null> {
    const { rows } = await pool.query<UserPublic>(
      'SELECT id, email, full_name, avatar_url, created_at FROM users WHERE id = $1',
      [id],
    );
    return rows[0] ?? null;
  },

  async create(data: { email: string; password: string; full_name: string }): Promise<UserPublic> {
    const { rows } = await pool.query<UserPublic>(
      `INSERT INTO users (email, password, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, avatar_url, created_at`,
      [data.email, data.password, data.full_name],
    );
    return rows[0];
  },

  async updateAvatar(id: string, avatar_url: string): Promise<UserPublic | null> {
    const { rows } = await pool.query<UserPublic>(
      `UPDATE users SET avatar_url = $1 WHERE id = $2
       RETURNING id, email, full_name, avatar_url, created_at`,
      [avatar_url, id],
    );
    return rows[0] ?? null;
  },
};
