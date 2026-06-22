import { Router } from 'express';
import { BoardController } from '../controllers/board.controller.js';
import taskRoutes from './task.routes.js';
import { asAuth } from '../lib/handler.js';
import { validate } from '../middlewares/validate.middleware.js';
import { boardNameSchema, columnNameSchema } from '../schemas/board.schema.js';

const router = Router({ mergeParams: true });

router.get('/', asAuth(BoardController.getBoards));
router.post('/', validate(boardNameSchema), asAuth(BoardController.createBoard));
router.patch('/:boardId', validate(boardNameSchema), asAuth(BoardController.renameBoard));
router.delete('/:boardId', asAuth(BoardController.deleteBoard));

// Columns
router.post('/:boardId/columns', validate(columnNameSchema), asAuth(BoardController.createColumn));
router.patch(
  '/:boardId/columns/:columnId',
  validate(columnNameSchema),
  asAuth(BoardController.renameColumn)
);
router.delete('/:boardId/columns/:columnId', asAuth(BoardController.deleteColumn));

// Nested tasks
router.use('/:boardId/columns/:columnId/tasks', taskRoutes);

export default router;
