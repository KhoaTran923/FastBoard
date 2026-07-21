import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';
import { InviteController } from '../controllers/invite.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  createInviteSchema,
} from '../schemas/project.schema.js';
import boardRoutes from './board.routes.js';
import { asAuth } from '../lib/handler.js';
import type { RequestHandler } from 'express';

const router = Router();
const auth = authenticate as RequestHandler;

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
router.patch(
  '/:id/members/:userId',
  validate(updateMemberRoleSchema),
  asAuth(ProjectController.updateMemberRole)
);

// Invite links (admin only)
router.get('/:id/invites', asAuth(InviteController.listForProject));
router.post('/:id/invites', validate(createInviteSchema), asAuth(InviteController.create));

// Activity history
router.get('/:id/activity', asAuth(ProjectController.getActivity));

// Nested boards
router.use('/:projectId/boards', boardRoutes);

export default router;
