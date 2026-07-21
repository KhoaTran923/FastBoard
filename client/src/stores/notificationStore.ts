import { create } from 'zustand';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notifications';
import type { AppNotification } from '../types';

interface NotificationState {
  items: AppNotification[];
  unread: number;
  loaded: boolean;

  fetch: () => Promise<void>;
  /** Prepend a notification pushed over the socket. */
  push: (n: AppNotification) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unread: 0,
  loaded: false,

  fetch: async () => {
    const { items, unread } = await getNotifications();
    set({ items, unread, loaded: true });
  },

  push: (n) => {
    // Sockets can redeliver; drop anything we already hold
    if (get().items.some((item) => item.id === n.id)) return;
    set((state) => ({ items: [n, ...state.items], unread: state.unread + 1 }));
  },

  markRead: async (id) => {
    const target = get().items.find((n) => n.id === id);
    if (!target || target.read_at) return;
    // Optimistic: flip locally, then persist
    set((state) => ({
      items: state.items.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ),
      unread: Math.max(0, state.unread - 1),
    }));
    try {
      await markNotificationRead(id);
    } catch {
      // Refetch to reconcile if the server disagreed
      void get().fetch();
    }
  },

  markAllRead: async () => {
    const now = new Date().toISOString();
    set((state) => ({
      items: state.items.map((n) => (n.read_at ? n : { ...n, read_at: now })),
      unread: 0,
    }));
    try {
      await markAllNotificationsRead();
    } catch {
      void get().fetch();
    }
  },

  reset: () => set({ items: [], unread: 0, loaded: false }),
}));
