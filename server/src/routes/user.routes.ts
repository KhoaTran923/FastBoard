import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { asAuth } from '../lib/handler.js';
import type { RequestHandler } from 'express';

const router = Router();
const auth = authenticate as RequestHandler;

// GET /api/users?q=<email> — search users by email (for adding project members).
router.get('/', auth, asAuth(UserController.search));

export default router;
