import type { Response } from 'express';
import { BoardService } from '../services/board.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

export const BoardController = {
  async getBoards(req: AuthenticatedRequest, res: Response) {
    try {
      const boards = await BoardService.getBoardsWithColumns(
        req.params.projectId!,
        req.user.userId
      );
      res.json({ success: true, data: boards });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(403).json({ success: false, error: message });
    }
  },

  async createBoard(req: AuthenticatedRequest, res: Response) {
    try {
      const board = await BoardService.createBoard(
        req.params.projectId!,
        req.body.name,
        req.user.userId
      );
      res.status(201).json({ success: true, data: board });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(403).json({ success: false, error: message });
    }
  },

  async deleteBoard(req: AuthenticatedRequest, res: Response) {
    try {
      await BoardService.deleteBoard(req.params.boardId!, req.user.userId);
      res.status(204).send();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(403).json({ success: false, error: message });
    }
  },

  async createColumn(req: AuthenticatedRequest, res: Response) {
    try {
      const column = await BoardService.createColumn(
        req.params.boardId!,
        req.body.name,
        req.user.userId
      );
      res.status(201).json({ success: true, data: column });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(403).json({ success: false, error: message });
    }
  },

  async renameColumn(req: AuthenticatedRequest, res: Response) {
    try {
      const column = await BoardService.renameColumn(
        req.params.columnId!,
        req.body.name,
        req.user.userId
      );
      res.json({ success: true, data: column });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(403).json({ success: false, error: message });
    }
  },

  async deleteColumn(req: AuthenticatedRequest, res: Response) {
    try {
      await BoardService.deleteColumn(req.params.columnId!, req.user.userId);
      res.status(204).send();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      res.status(403).json({ success: false, error: message });
    }
  },
};
