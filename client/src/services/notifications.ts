import api from './http';
import type { ApiResponse, AppNotification } from '../types';

export interface NotificationList {
  items: AppNotification[];
  unread: number;
}

export async function getNotifications(limit = 30): Promise<NotificationList> {
  const { data } = await api.get<ApiResponse<NotificationList>>('/notifications', {
    params: { limit },
  });
  return data.data ?? { items: [], unread: 0 };
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all');
}
