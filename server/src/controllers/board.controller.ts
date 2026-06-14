import { Request, Response } from 'express';
import { BoardService } from '../services/board.service.js';

function handleError(res: Response, err: unknown) {
  const e = err as { code?: string; status?: number; message: string };
  res.status(e.status ?? 500).json({ success: false, error: e.code, message: e.message });
}

export const BoardController = {
  async getBoards(req: Request, res: Response): Promise<void> {
    try {
      const data = await BoardService.getBoards(req.params.projectId, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async getBoardWithColumns(req: Request, res: Response): Promise<void> {
    try {
      const data = await BoardService.getBoardWithColumns(req.params.id, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async createBoard(req: Request, res: Response): Promise<void> {
    try {
      const data = await BoardService.createBoard(req.params.projectId, req.user!.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async updateBoard(req: Request, res: Response): Promise<void> {
    try {
      const data = await BoardService.updateBoard(req.params.id, req.user!.userId, req.body);
      res.json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async deleteBoard(req: Request, res: Response): Promise<void> {
    try {
      await BoardService.deleteBoard(req.params.id, req.user!.userId);
      res.json({ success: true, message: 'Board đã được xóa' });
    } catch (err) { handleError(res, err); }
  },

  async createColumn(req: Request, res: Response): Promise<void> {
    try {
      const data = await BoardService.createColumn(req.params.boardId, req.user!.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async updateColumn(req: Request, res: Response): Promise<void> {
    try {
      const data = await BoardService.updateColumn(req.params.columnId, req.user!.userId, req.body);
      res.json({ success: true, data });
    } catch (err) { handleError(res, err); }
  },

  async deleteColumn(req: Request, res: Response): Promise<void> {
    try {
      await BoardService.deleteColumn(req.params.columnId, req.user!.userId);
      res.json({ success: true, message: 'Column đã được xóa' });
    } catch (err) { handleError(res, err); }
  },
};
