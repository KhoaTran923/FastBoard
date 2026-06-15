import { Router } from 'express';
import { BoardController } from '../controllers/board.controller.js';
import taskRoutes from './task.routes.js';
import { asAuth } from '../lib/handler.js';

const router = Router({ mergeParams: true });

router.get('/', asAuth(BoardController.getBoards));
router.post('/', asAuth(BoardController.createBoard));
router.delete('/:boardId', asAuth(BoardController.deleteBoard));

// Columns
router.post('/:boardId/columns', asAuth(BoardController.createColumn));
router.delete('/:boardId/columns/:columnId', asAuth(BoardController.deleteColumn));

// Nested tasks
router.use('/:boardId/columns/:columnId/tasks', taskRoutes);

export default router;
