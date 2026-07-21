import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { BoardRepository } from '../repositories/board.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import type { JwtPayload } from '../types/index.js';

/**
 * Realtime layer: clients authenticate the handshake with the REST JWT and
 * join one room per board ("board:<id>") after a membership check. Task
 * mutations are broadcast to that room via emitBoardEvent().
 */

interface BoardSocket extends Socket {
  data: { user: JwtPayload };
}

let io: Server | null = null;

const boardRoom = (boardId: string) => `board:${boardId}`;
const userRoom = (userId: string) => `user:${userId}`;

/** True if the user owns the board's project or is a member of it. */
async function canAccessBoard(boardId: string, userId: string): Promise<boolean> {
  const board = await BoardRepository.findById(boardId);
  if (!board) return false;
  const project = await ProjectRepository.findById(board.project_id);
  if (!project) return false;
  if (project.owner_id === userId) return true;
  const member = await ProjectRepository.getMember(board.project_id, userId);
  return member !== null;
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Handshake auth: reject connections without a valid access token
  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: string }).token;
    if (!token) {
      next(new Error('No token provided'));
      return;
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      (socket as BoardSocket).data.user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as BoardSocket;

    // Personal room: notifications are pushed here regardless of open board
    void socket.join(userRoom(socket.data.user.userId));

    socket.on('board:join', async (boardId: unknown, ack?: (ok: boolean) => void) => {
      if (typeof boardId !== 'string') {
        ack?.(false);
        return;
      }
      try {
        const allowed = await canAccessBoard(boardId, socket.data.user.userId);
        if (allowed) await socket.join(boardRoom(boardId));
        ack?.(allowed);
      } catch {
        ack?.(false);
      }
    });

    socket.on('board:leave', async (boardId: unknown) => {
      if (typeof boardId === 'string') await socket.leave(boardRoom(boardId));
    });
  });

  console.log('Socket.io realtime server attached');
  return io;
}

/**
 * Broadcast an event to everyone viewing a board, excluding the actor's own
 * socket (exceptSocketId) so it gets no echo of its own change.
 */
export function emitBoardEvent(
  boardId: string,
  event: string,
  payload: unknown,
  exceptSocketId?: string
): void {
  if (!io) return; // unit tests run controllers without a socket server
  const room = exceptSocketId
    ? io.to(boardRoom(boardId)).except(exceptSocketId)
    : io.to(boardRoom(boardId));
  room.emit(event, payload);
}

/** Push an event to every connected session of one user. */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) return; // unit tests run services without a socket server
  io.to(userRoom(userId)).emit(event, payload);
}
