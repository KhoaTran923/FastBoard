import { AuthService } from '../services/auth.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import bcrypt from 'bcrypt';

jest.mock('../repositories/user.repository.js', () => ({
  UserRepository: {
    findByEmail: jest.fn(),
    create: jest.fn(),
  },
}));

const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'khoa@fastboard.dev',
  full_name: 'Trần Anh Khoa',
  avatar_url: null,
  created_at: new Date(),
};

describe('AuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserRepository.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.register({
        email: 'khoa@fastboard.dev',
        password: 'Password123!',
        full_name: 'Trần Anh Khoa',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(UserRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should throw EMAIL_TAKEN if email already exists', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue({ ...mockUser, password: 'hashed' });

      await expect(
        AuthService.register({ email: 'khoa@fastboard.dev', password: 'Password123!', full_name: 'Khoa' }),
      ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const hashedPw = await bcrypt.hash('Password123!', 10);
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue({ ...mockUser, password: hashedPw });

      const result = await AuthService.login({ email: 'khoa@fastboard.dev', password: 'Password123!' });

      expect(result.user.email).toBe('khoa@fastboard.dev');
      expect(result.accessToken).toBeDefined();
    });

    it('should throw INVALID_CREDENTIALS for wrong password', async () => {
      const hashedPw = await bcrypt.hash('Password123!', 10);
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue({ ...mockUser, password: hashedPw });

      await expect(
        AuthService.login({ email: 'khoa@fastboard.dev', password: 'WrongPassword' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    it('should throw INVALID_CREDENTIALS for unknown email', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        AuthService.login({ email: 'unknown@email.com', password: 'Password123!' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });
  });
});
