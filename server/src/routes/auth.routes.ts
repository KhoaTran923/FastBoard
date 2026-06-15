import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../schemas/auth.schema.js';
import { asAuth } from '../lib/handler.js';
import type { RequestHandler } from 'express';

const router = Router();
const auth = authenticate as RequestHandler;

router.post('/register', validate(registerSchema), AuthController.register as RequestHandler);
router.post('/login', validate(loginSchema), AuthController.login as RequestHandler);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refresh as RequestHandler);
router.get('/me', auth, asAuth(AuthController.me));

export default router;
