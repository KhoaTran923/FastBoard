import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository.js';
import type { JwtPayload, UserPublic } from '../types/index.js';

const SALT_ROUNDS = 10;

export const AuthService = {
  async register(data: {
    email: string;
    password: string;
    full_name: string;
  }): Promise<{ user: UserPublic; accessToken: string; refreshToken: string }> {
    const existing = await UserRepository.findByEmail(data.email);
    if (existing) {
      throw Object.assign(new Error('Email đã được sử dụng'), { code: 'EMAIL_TAKEN', status: 409 });
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await UserRepository.create({ ...data, password: hashedPassword });
    const tokens = AuthService.generateTokens(user);
    return { user, ...tokens };
  },

  async login(data: {
    email: string;
    password: string;
  }): Promise<{ user: UserPublic; accessToken: string; refreshToken: string }> {
    const user = await UserRepository.findByEmail(data.email);
    if (!user) {
      throw Object.assign(new Error('Email hoặc mật khẩu không đúng'), {
        code: 'INVALID_CREDENTIALS',
        status: 401,
      });
    }

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      throw Object.assign(new Error('Email hoặc mật khẩu không đúng'), {
        code: 'INVALID_CREDENTIALS',
        status: 401,
      });
    }

    const { password: _pw, ...userPublic } = user;
    const tokens = AuthService.generateTokens(userPublic as UserPublic);
    return { user: userPublic as UserPublic, ...tokens };
  },

  refreshToken(token: string): { accessToken: string; refreshToken: string } {
    try {
      const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JwtPayload;
      return AuthService.generateTokens({ id: payload.userId, email: payload.email } as UserPublic);
    } catch {
      throw Object.assign(new Error('Refresh token không hợp lệ'), {
        code: 'INVALID_REFRESH_TOKEN',
        status: 401,
      });
    }
  },

  generateTokens(user: UserPublic): { accessToken: string; refreshToken: string } {
    const payload: JwtPayload = { userId: user.id, email: user.email };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    } as jwt.SignOptions);
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    } as jwt.SignOptions);
    return { accessToken, refreshToken };
  },
};
