import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { apiLimiter } from './middlewares/rateLimit.middleware.js';
import authRoutes from './routes/auth.routes.js';
import inviteRoutes from './routes/invite.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import projectRoutes from './routes/project.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();

// Middleware
app.use(helmet()); // security headers (CSP is irrelevant for a JSON API)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
// 100kb covers the largest legitimate payload; bigger bodies are rejected
app.use(express.json({ limit: '100kb' }));

// Rate limiting (stricter limiter on auth routes)
app.use('/api/', apiLimiter);

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/notifications', notificationRoutes);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  // Malformed JSON bodies and oversized payloads arrive here as client errors
  const status = 'status' in err && typeof err.status === 'number' ? err.status : 500;
  res
    .status(status)
    .json({ success: false, error: status === 500 ? 'Internal server error' : err.message });
});

export default app;
