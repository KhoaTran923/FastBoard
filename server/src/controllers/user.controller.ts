import { Request, Response } from 'express';
import { UserRepository } from '../repositories/user.repository.js';

export const UserController = {
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = await UserRepository.findById(req.user!.userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'User không tồn tại' });
        return;
      }
      res.json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: (err as Error).message });
    }
  },
};
