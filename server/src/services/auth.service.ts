import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema.js';

const SALT_ROUNDS = 10;

export const AuthService = {
  async register(data: RegisterInput) {
    const existing = await UserRepository.findByEmail(data.email);
    if (existing) {
      throw new Error('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await UserRepository.create({
      email: data.email,
      password: hashedPassword,
      full_name: data.full_name,
    });

    const tokenPayload = { userId: user.id, email: user.email };
    return {
      user,
      access_token: signAccessToken(tokenPayload),
      refresh_token: signRefreshToken(tokenPayload),
    };
  },

  async login(data: LoginInput) {
    const user = await UserRepository.findByEmailWithPassword(data.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const { password: _pw, ...safeUser } = user;
    const tokenPayload = { userId: safeUser.id, email: safeUser.email };
    return {
      user: safeUser,
      access_token: signAccessToken(tokenPayload),
      refresh_token: signRefreshToken(tokenPayload),
    };
  },

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const user = await UserRepository.findById(payload.userId);
    if (!user) throw new Error('User not found');

    const tokenPayload = { userId: user.id, email: user.email };
    return {
      access_token: signAccessToken(tokenPayload),
      refresh_token: signRefreshToken(tokenPayload),
    };
  },

  async getProfile(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new Error('User not found');
    return user;
  },
};
