import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../services/auth.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import * as jwtLib from '../lib/jwt.js';
import bcrypt from 'bcryptjs';

vi.mock('../repositories/user.repository.js');
vi.mock('../lib/jwt.js');
vi.mock('bcryptjs');

const mockUser = {
  id: 'uuid-1',
  email: 'khoa@example.com',
  full_name: 'Tran Anh Khoa',
  avatar_url: undefined,
  created_at: new Date(),
  password: 'hashed_password',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(jwtLib.signAccessToken).mockReturnValue('access_token');
  vi.mocked(jwtLib.signRefreshToken).mockReturnValue('refresh_token');
});

describe('AuthService.register', () => {
  it('should create a user and return tokens', async () => {
    vi.mocked(UserRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
    vi.mocked(UserRepository.create).mockResolvedValue(mockUser);

    const result = await AuthService.register({
      email: 'khoa@example.com',
      password: 'Password1',
      full_name: 'Tran Anh Khoa',
    });

    expect(result.access_token).toBe('access_token');
    expect(result.refresh_token).toBe('refresh_token');
    expect(result.user.email).toBe('khoa@example.com');
  });

  it('should throw if email already exists', async () => {
    vi.mocked(UserRepository.findByEmail).mockResolvedValue(mockUser);

    await expect(
      AuthService.register({
        email: 'khoa@example.com',
        password: 'Password1',
        full_name: 'Tran Anh Khoa',
      })
    ).rejects.toThrow('Email already in use');
  });
});

describe('AuthService.login', () => {
  it('should return tokens on valid credentials', async () => {
    vi.mocked(UserRepository.findByEmailWithPassword).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await AuthService.login({
      email: 'khoa@example.com',
      password: 'Password1',
    });

    expect(result.access_token).toBe('access_token');
    expect((result.user as Record<string, unknown>).password).toBeUndefined();
  });

  it('should throw on invalid password', async () => {
    vi.mocked(UserRepository.findByEmailWithPassword).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      AuthService.login({ email: 'khoa@example.com', password: 'wrong' })
    ).rejects.toThrow('Invalid email or password');
  });

  it('should throw if user not found', async () => {
    vi.mocked(UserRepository.findByEmailWithPassword).mockResolvedValue(null);

    await expect(
      AuthService.login({ email: 'notfound@example.com', password: 'pass' })
    ).rejects.toThrow('Invalid email or password');
  });
});
