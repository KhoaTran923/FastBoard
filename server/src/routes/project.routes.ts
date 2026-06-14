import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createProjectSchema, updateProjectSchema, addMemberSchema } from '../schemas/project.schema.js';

const router = Router();
router.use(authenticate);

router.get('/', ProjectController.getAll);
router.post('/', validate(createProjectSchema), ProjectController.create);
router.get('/:id', ProjectController.getById);
router.put('/:id', validate(updateProjectSchema), ProjectController.update);
router.delete('/:id', ProjectController.delete);

router.get('/:id/members', ProjectController.getMembers);
router.post('/:id/members', validate(addMemberSchema), ProjectController.addMember);
router.delete('/:id/members/:memberId', ProjectController.removeMember);

export default router;
