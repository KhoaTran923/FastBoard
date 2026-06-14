import { Request, Response } from 'express';
import { TaskService } from '../services/task.service.js';

function handleError(res: Response, err: unknown) {
  const e = err as { code?: string; status?: number; message: string };
  res.status(e.status ?? 500).json({ success: false, error: e.code, message: e.message });
}

export const TaskController = {
  async getByColumn(req: Request, res: Response): Promise<void> {
    try {
      const data = await TaskService.getByColumn(req.params.columnId, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = await TaskService.create(req.params.columnId, req.user!.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const data = await TaskService.update(req.params.id, req.user!.userId, req.body);
      res.json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async move(req: Request, res: Response): Promise<void> {
    try {
      const { column_id, position } = req.body as { column_id: string; position: number };
      const data = await TaskService.move(req.params.id, req.user!.userId, column_id, position);
      res.json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await TaskService.delete(req.params.id, req.user!.userId);
      res.json({ success: true, message: 'Task đã được xóa' });
    } catch (err) { handleError(res, err); }
  },
};
