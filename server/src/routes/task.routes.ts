import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from '../schemas/task.schema.js';
import type { RequestHandler } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router({ mergeParams: true });
const asAuth = (fn: (req: AuthenticatedRequest, res: any) => any): RequestHandler =>
  (req, res, next) => fn(req as AuthenticatedRequest, res).catch(next);

router.get('/', asAuth(TaskController.getByColumn));
router.post('/', validate(createTaskSchema), asAuth(TaskController.create));
router.put('/:taskId', validate(updateTaskSchema), asAuth(TaskController.update));
router.patch('/:taskId/move', validate(moveTaskSchema), asAuth(TaskController.move));
router.delete('/:taskId', asAuth(TaskController.delete));

export default router;
