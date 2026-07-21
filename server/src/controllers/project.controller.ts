import type { Response } from 'express';
import { ProjectService } from '../services/project.service.js';
import { ActivityService } from '../services/activity.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

export const ProjectController = {
  async getAll(req: AuthenticatedRequest, res: Response) {
    const projects = await ProjectService.getAll(req.user.userId);
    res.json({ success: true, data: projects });
  },

  async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const project = await ProjectService.getById(req.params.id!, req.user.userId);
      res.json({ success: true, data: project });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      const status = message === 'Access denied' ? 403 : 404;
      res.status(status).json({ success: false, error: message });
    }
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const project = await ProjectService.create(req.body, req.user.userId);
    res.status(201).json({ success: true, data: project });
  },

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const project = await ProjectService.update(req.params.id!, req.body, req.user.userId);
      res.json({ success: true, data: project });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      const status = message === 'Forbidden' ? 403 : 400;
      res.status(status).json({ success: false, error: message });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      await ProjectService.delete(req.params.id!, req.user.userId);
      res.status(204).send();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(403).json({ success: false, error: message });
    }
  },

  async getMembers(req: AuthenticatedRequest, res: Response) {
    const members = await ProjectService.getMembers(req.params.id!, req.user.userId);
    res.json({ success: true, data: members });
  },

  async addMember(req: AuthenticatedRequest, res: Response) {
    try {
      const { user_id, role } = req.body;
      const member = await ProjectService.addMember(req.params.id!, user_id, role, req.user.userId);
      res.status(201).json({ success: true, data: member });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(403).json({ success: false, error: message });
    }
  },

  async removeMember(req: AuthenticatedRequest, res: Response) {
    try {
      await ProjectService.removeMember(req.params.id!, req.params.userId!, req.user.userId);
      res.status(204).send();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(403).json({ success: false, error: message });
    }
  },

  async updateMemberRole(req: AuthenticatedRequest, res: Response) {
    try {
      const member = await ProjectService.updateMemberRole(
        req.params.id!,
        req.params.userId!,
        req.body.role,
        req.user.userId
      );
      res.json({ success: true, data: member });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      const status = message === 'Member not found' ? 404 : 403;
      res.status(status).json({ success: false, error: message });
    }
  },

  async getActivity(req: AuthenticatedRequest, res: Response) {
    try {
      const limit = Number(req.query.limit) || 50;
      const before = req.query.before ? new Date(String(req.query.before)) : undefined;
      const entries = await ActivityService.list(req.params.id!, req.user.userId, limit, before);
      res.json({ success: true, data: entries });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      const status = message === 'Project not found' ? 404 : 403;
      res.status(status).json({ success: false, error: message });
    }
  },
};
