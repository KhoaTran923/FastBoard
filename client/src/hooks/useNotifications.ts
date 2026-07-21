import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import type { AppNotification } from '../types';

/**
 * Keeps the notification store alive: loads the list once the user is
 * authenticated and prepends realtime pushes from the server.
 */
export function useNotifications(): void {
  const { socket } = useSocket();
  const authStatus = useAuthStore((s) => s.status);
  const loaded = useNotificationStore((s) => s.loaded);

  useEffect(() => {
    if (authStatus === 'authenticated' && !loaded) {
      void useNotificationStore.getState().fetch();
    }
  }, [authStatus, loaded]);

  useEffect(() => {
    const onNew = (n: AppNotification) => useNotificationStore.getState().push(n);
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, [socket]);
}
