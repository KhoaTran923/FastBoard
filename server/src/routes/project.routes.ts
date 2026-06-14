import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createProjectSchema, updateProjectSchema, addMemberSchema } from '../schemas/project.schema.js';
import boardRoutes from './board.routes.js';
import type { RequestHandler } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = authenticate as RequestHandler;
const asAuth = (fn: (req: AuthenticatedRequest, res: any) => any): RequestHandler =>
  (req, res, next) => fn(req as AuthenticatedRequest, res).catch(next);

router.use(auth);

router.get('/', asAuth(ProjectController.getAll));
router.post('/', validate(createProjectSchema), asAuth(ProjectController.create));
router.get('/:id', asAuth(ProjectController.getById));
router.put('/:id', validate(updateProjectSchema), asAuth(ProjectController.update));
router.delete('/:id', asAuth(ProjectController.delete));

// Members
router.get('/:id/members', asAuth(ProjectController.getMembers));
router.post('/:id/members', validate(addMemberSchema), asAuth(ProjectController.addMember));
router.delete('/:id/members/:userId', asAuth(ProjectController.removeMember));

// Nested boards
router.use('/:projectId/boards', boardRoutes);

export default router;
