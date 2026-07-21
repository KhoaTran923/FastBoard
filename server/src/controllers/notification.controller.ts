import type { Response } from 'express';
import { NotificationService } from '../services/notification.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

export const NotificationController = {
  /** GET /notifications?limit=30 */
  async list(req: AuthenticatedRequest, res: Response) {
    const limit = Number(req.query.limit) || 30;
    const result = await NotificationService.list(req.user.userId, limit);
    res.json({ success: true, data: result });
  },

  /** PATCH /notifications/:id/read */
  async markRead(req: AuthenticatedRequest, res: Response) {
    try {
      await NotificationService.markRead(req.params.id!, req.user.userId);
      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(404).json({ success: false, error: message });
    }
  },

  /** POST /notifications/read-all */
  async markAllRead(req: AuthenticatedRequest, res: Response) {
    await NotificationService.markAllRead(req.user.userId);
    res.json({ success: true });
  },
};
