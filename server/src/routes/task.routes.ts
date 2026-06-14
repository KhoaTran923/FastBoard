import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from '../schemas/task.schema.js';

const router = Router();
router.use(authenticate);

router.get('/column/:columnId', TaskController.getByColumn);
router.post('/column/:columnId', validate(createTaskSchema), TaskController.create);

router.put('/:id', validate(updateTaskSchema), TaskController.update);
router.patch('/:id/move', validate(moveTaskSchema), TaskController.move);
router.delete('/:id', TaskController.delete);

export default router;
