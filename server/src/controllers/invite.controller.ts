import type { Response } from 'express';
import { InviteService } from '../services/invite.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

const fail = (res: Response, err: unknown) => {
  const message = err instanceof Error ? err.message : 'Error';
  const status = message.includes('not found') ? 404 : 403;
  res.status(status).json({ success: false, error: message });
};

export const InviteController = {
  /** POST /projects/:id/invites */
  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const { role, expires_in_days } = req.body;
      const invite = await InviteService.create(
        req.params.id!,
        role,
        req.user.userId,
        expires_in_days
      );
      res.status(201).json({ success: true, data: invite });
    } catch (err) {
      fail(res, err);
    }
  },

  /** GET /projects/:id/invites */
  async listForProject(req: AuthenticatedRequest, res: Response) {
    try {
      const invites = await InviteService.listForProject(req.params.id!, req.user.userId);
      res.json({ success: true, data: invites });
    } catch (err) {
      fail(res, err);
    }
  },

  /** GET /invites/:token */
  async preview(req: AuthenticatedRequest, res: Response) {
    try {
      const preview = await InviteService.preview(req.params.token!, req.user.userId);
      res.json({ success: true, data: preview });
    } catch (err) {
      fail(res, err);
    }
  },

  /** POST /invites/:token/accept */
  async accept(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await InviteService.accept(req.params.token!, req.user.userId);
      res.json({ success: true, data: result });
    } catch (err) {
      fail(res, err);
    }
  },

  /** DELETE /invites/:token */
  async revoke(req: AuthenticatedRequest, res: Response) {
    try {
      await InviteService.revoke(req.params.token!, req.user.userId);
      res.status(204).send();
    } catch (err) {
      fail(res, err);
    }
  },
};
