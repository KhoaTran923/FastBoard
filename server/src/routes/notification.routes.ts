import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { asAuth } from '../lib/handler.js';
import type { RequestHandler } from 'express';

const router = Router();

router.use(authenticate as RequestHandler);

router.get('/', asAuth(NotificationController.list));
router.post('/read-all', asAuth(NotificationController.markAllRead));
router.patch('/:id/read', asAuth(NotificationController.markRead));

export default router;
