import { Router } from 'express';
import { BoardController } from '../controllers/board.controller.js';
import taskRoutes from './task.routes.js';
import type { RequestHandler } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router({ mergeParams: true });
const asAuth = (fn: (req: AuthenticatedRequest, res: any) => any): RequestHandler =>
  (req, res, next) => fn(req as AuthenticatedRequest, res).catch(next);

router.get('/', asAuth(BoardController.getBoards));
router.post('/', asAuth(BoardController.createBoard));
router.delete('/:boardId', asAuth(BoardController.deleteBoard));

// Columns
router.post('/:boardId/columns', asAuth(BoardController.createColumn));
router.delete('/:boardId/columns/:columnId', asAuth(BoardController.deleteColumn));

// Nested tasks
router.use('/:boardId/columns/:columnId/tasks', taskRoutes);

export default router;
