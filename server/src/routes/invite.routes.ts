import { Router } from 'express';
import { InviteController } from '../controllers/invite.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { asAuth } from '../lib/handler.js';
import type { RequestHandler } from 'express';

// Token-addressed invite endpoints (the recipient side of an invite link)
const router = Router();

router.use(authenticate as RequestHandler);

router.get('/:token', asAuth(InviteController.preview));
router.post('/:token/accept', asAuth(InviteController.accept));
router.delete('/:token', asAuth(InviteController.revoke));

export default router;
