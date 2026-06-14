import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import projectRoutes from './routes/project.routes.js';
import boardRoutes from './routes/board.routes.js';
import taskRoutes from './routes/task.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { testConnection } from './db/pool.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

export const io = new SocketServer(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173' },
});

io.on('connection', (socket) => {
  socket.on('board:join', (boardId: string) => socket.join(`board:${boardId}`));
  socket.on('board:leave', (boardId: string) => socket.leave(`board:${boardId}`));
  socket.on('disconnect', () => {});
});

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'RATE_LIMIT_EXCEEDED', message: 'Quá nhiều request' },
});
app.use('/api', limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'fastboard-server' });
});

const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/projects`, projectRoutes);
app.use(`${API}/boards`, boardRoutes);
app.use(`${API}/tasks`, taskRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Route không tồn tại' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  await testConnection();
  httpServer.listen(PORT, () => {
    console.log(`🚀 FastBoard Server → http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   API:    http://localhost:${PORT}${API}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
