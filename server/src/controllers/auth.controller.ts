import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';

export const AuthController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: unknown) {
      const e = err as { code?: string; status?: number; message: string };
      res.status(e.status ?? 500).json({ success: false, error: e.code, message: e.message });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      res.json({ success: true, data: result });
    } catch (err: unknown) {
      const e = err as { code?: string; status?: number; message: string };
      res.status(e.status ?? 500).json({ success: false, error: e.code, message: e.message });
    }
  },

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      if (!refreshToken) {
        res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'refreshToken is required' });
        return;
      }
      const tokens = AuthService.refreshToken(refreshToken);
      res.json({ success: true, data: tokens });
    } catch (err: unknown) {
      const e = err as { code?: string; status?: number; message: string };
      res.status(e.status ?? 500).json({ success: false, error: e.code, message: e.message });
    }
  },

  async me(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: req.user });
  },
};
