import { Router } from 'express';
import { BoardController } from '../controllers/board.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createBoardSchema, updateBoardSchema } from '../schemas/board.schema.js';

const router = Router();
router.use(authenticate);

router.get('/project/:projectId', BoardController.getBoards);
router.post('/project/:projectId', validate(createBoardSchema), BoardController.createBoard);

router.get('/:id', BoardController.getBoardWithColumns);
router.put('/:id', validate(updateBoardSchema), BoardController.updateBoard);
router.delete('/:id', BoardController.deleteBoard);

router.post('/:boardId/columns', BoardController.createColumn);
router.put('/columns/:columnId', BoardController.updateColumn);
router.delete('/columns/:columnId', BoardController.deleteColumn);

export default router;
