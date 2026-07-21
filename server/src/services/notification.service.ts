import { NotificationRepository } from '../repositories/notification.repository.js';
import { emitToUser } from '../socket/index.js';

export type NotificationType =
  | 'member_added'
  | 'role_changed'
  | 'task_assigned'
  | 'invite_accepted';

export const NotificationService = {
  /**
   * Stores a notification per recipient and pushes it over the socket.
   * The actor never notifies themselves. Never throws: a failed notification
   * must not fail the mutation that triggered it.
   */
  async push(
    recipientIds: string[],
    actorId: string,
    projectId: string,
    type: NotificationType,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const recipients = [...new Set(recipientIds)].filter((id) => id !== actorId);
    for (const userId of recipients) {
      try {
        const row = await NotificationRepository.insert({
          user_id: userId,
          actor_id: actorId,
          project_id: projectId,
          type,
          metadata,
        });
        emitToUser(userId, 'notification:new', row);
      } catch (err) {
        console.error('Notification failed:', err instanceof Error ? err.message : err);
      }
    }
  },

  async list(userId: string, limit = 30) {
    const [items, unread] = await Promise.all([
      NotificationRepository.listByUser(userId, Math.min(limit, 100)),
      NotificationRepository.unreadCount(userId),
    ]);
    return { items, unread };
  },

  async markRead(id: string, userId: string) {
    const ok = await NotificationRepository.markRead(id, userId);
    if (!ok) throw new Error('Notification not found');
  },

  async markAllRead(userId: string) {
    await NotificationRepository.markAllRead(userId);
  },
};
