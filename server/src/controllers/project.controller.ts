import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service.js';

function handleError(res: Response, err: unknown) {
  const e = err as { code?: string; status?: number; message: string };
  res.status(e.status ?? 500).json({ success: false, error: e.code, message: e.message });
}

export const ProjectController = {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const data = await ProjectService.getAll(req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const data = await ProjectService.getById(req.params.id, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = await ProjectService.create({ ...req.body, owner_id: req.user!.userId });
      res.status(201).json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const data = await ProjectService.update(req.params.id, req.user!.userId, req.body);
      res.json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await ProjectService.delete(req.params.id, req.user!.userId);
      res.json({ success: true, message: 'Project đã được xóa' });
    } catch (err) { handleError(res, err); }
  },

  async getMembers(req: Request, res: Response): Promise<void> {
    try {
      const data = await ProjectService.getMembers(req.params.id, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async addMember(req: Request, res: Response): Promise<void> {
    try {
      const { email, role } = req.body as { email: string; role: 'admin' | 'member' | 'viewer' };
      await ProjectService.addMember(req.params.id, req.user!.userId, email, role);
      res.json({ success: true, message: 'Đã thêm thành viên' });
    } catch (err) { handleError(res, err); }
  },

  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      await ProjectService.removeMember(req.params.id, req.user!.userId, req.params.memberId);
      res.json({ success: true, message: 'Đã xóa thành viên' });
    } catch (err) { handleError(res, err); }
  },
};
