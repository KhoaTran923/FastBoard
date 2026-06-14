import type { Response } from 'express';
import { TaskService } from '../services/task.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

export const TaskController = {
  async getByColumn(req: AuthenticatedRequest, res: Response) {
    try {
      const tasks = await TaskService.getByColumn(req.params.columnId!, req.user.userId);
      res.json({ success: true, data: tasks });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(403).json({ success: false, error: message });
    }
  },

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const task = await TaskService.create(
        req.params.columnId!, req.body, req.user.userId
      );
      res.status(201).json({ success: true, data: task });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(403).json({ success: false, error: message });
    }
  },

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const task = await TaskService.update(
        req.params.taskId!, req.body, req.user.userId
      );
      res.json({ success: true, data: task });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(403).json({ success: false, error: message });
    }
  },

  async move(req: AuthenticatedRequest, res: Response) {
    try {
      const { column_id, position } = req.body;
      const task = await TaskService.move(
        req.params.taskId!, column_id, position, req.user.userId
      );
      res.json({ success: true, data: task });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(403).json({ success: false, error: message });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      await TaskService.delete(req.params.taskId!, req.user.userId);
      res.status(204).send();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(403).json({ success: false, error: message });
    }
  },
};
