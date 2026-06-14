import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

export const AuthController = {
  async register(req: Request, res: Response) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      const status = message === 'Email already in use' ? 409 : 400;
      res.status(status).json({ success: false, error: message });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const result = await AuthService.login(req.body);
      res.json({ success: true, data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      res.status(401).json({ success: false, error: message });
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      const { refresh_token } = req.body;
      const result = await AuthService.refresh(refresh_token);
      res.json({ success: true, data: result });
    } catch {
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }
  },

  async me(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await AuthService.getProfile(req.user.userId);
      res.json({ success: true, data: user });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get profile';
      res.status(404).json({ success: false, error: message });
    }
  },
};
