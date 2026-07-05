import { useSyncExternalStore } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../services/socket';

function subscribe(onStoreChange: () => void): () => void {
  const socket = getSocket();
  socket.on('connect', onStoreChange);
  socket.on('disconnect', onStoreChange);
  return () => {
    socket.off('connect', onStoreChange);
    socket.off('disconnect', onStoreChange);
  };
}

/** The app-wide realtime socket plus a reactive `connected` flag. */
export function useSocket(): { socket: Socket; connected: boolean } {
  const socket = getSocket();
  const connected = useSyncExternalStore(subscribe, () => socket.connected);
  return { socket, connected };
}
