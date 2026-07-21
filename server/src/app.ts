import 'dotenv/config';
import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';

import { apiLimiter } from './middlewares/rateLimit.middleware.js';
import authRoutes from './routes/auth.routes.js';
import inviteRoutes from './routes/invite.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import projectRoutes from './routes/project.routes.js';
import userRoutes from './routes/user.routes.js';
import { initSocket } from './socket/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

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
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Express and Socket.io share one HTTP server on the same port
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`FastBoard server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
