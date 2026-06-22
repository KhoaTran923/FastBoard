import type { Response } from 'express';
import { UserService } from '../services/user.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

export const UserController = {
  async search(req: AuthenticatedRequest, res: Response) {
    const term = typeof req.query.q === 'string' ? req.query.q : '';
    const users = await UserService.search(term);
    res.json({ success: true, data: users });
  },
};
