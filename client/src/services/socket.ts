import { io, type Socket } from 'socket.io-client';
import { API_URL, socketMeta, tokenStore } from './http';

// The realtime server shares the REST API's origin, so strip the /api path
const SOCKET_URL = new URL(API_URL, window.location.origin).origin;

let socket: Socket | null = null;

/** Lazily create the app-wide socket (does not connect yet). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      // Evaluated on every (re)connection, so a refreshed token is picked up
      auth: (cb) => cb({ token: tokenStore.access }),
    });

    // Publish our socket id so REST requests can carry it (X-Socket-Id)
    socket.on('connect', () => {
      socketMeta.id = socket?.id ?? null;
    });
    socket.on('disconnect', () => {
      socketMeta.id = null;
    });
  }
  return socket;
}

/** Connect (idempotent). Called once the user is authenticated. */
export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

/** Disconnect on logout. */
export function disconnectSocket(): void {
  socket?.disconnect();
}
