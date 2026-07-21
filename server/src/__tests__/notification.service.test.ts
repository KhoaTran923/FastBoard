import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../services/notification.service.js';
import { NotificationRepository } from '../repositories/notification.repository.js';

vi.mock('../repositories/notification.repository.js');

const mockRow = {
  id: 'notif-1',
  user_id: 'user-2',
  actor_id: 'user-1',
  project_id: 'proj-1',
  type: 'task_assigned',
  metadata: null,
  read_at: null,
  created_at: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe('NotificationService.push', () => {
  it('should store one notification per recipient', async () => {
    vi.mocked(NotificationRepository.insert).mockResolvedValue(mockRow);

    await NotificationService.push(['user-2', 'user-3'], 'user-1', 'proj-1', 'task_assigned', {
      task_title: 'Fix bug',
    });

    expect(NotificationRepository.insert).toHaveBeenCalledTimes(2);
  });

  it('should never notify the actor about their own action', async () => {
    vi.mocked(NotificationRepository.insert).mockResolvedValue(mockRow);

    await NotificationService.push(['user-1', 'user-2'], 'user-1', 'proj-1', 'member_added');

    expect(NotificationRepository.insert).toHaveBeenCalledTimes(1);
    expect(NotificationRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-2' })
    );
  });

  it('should deduplicate recipients', async () => {
    vi.mocked(NotificationRepository.insert).mockResolvedValue(mockRow);

    await NotificationService.push(['user-2', 'user-2'], 'user-1', 'proj-1', 'member_added');

    expect(NotificationRepository.insert).toHaveBeenCalledTimes(1);
  });

  it('should swallow storage failures instead of failing the mutation', async () => {
    vi.mocked(NotificationRepository.insert).mockRejectedValue(new Error('db down'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      NotificationService.push(['user-2'], 'user-1', 'proj-1', 'member_added')
    ).resolves.toBeUndefined();

    errorSpy.mockRestore();
  });
});

describe('NotificationService.markRead', () => {
  it('should throw when the notification does not belong to the user', async () => {
    vi.mocked(NotificationRepository.markRead).mockResolvedValue(false);

    await expect(NotificationService.markRead('notif-1', 'someone-else')).rejects.toThrow(
      'Notification not found'
    );
  });
});

describe('NotificationService.list', () => {
  it('should return items with the unread count', async () => {
    vi.mocked(NotificationRepository.listByUser).mockResolvedValue([
      { ...mockRow, actor_name: 'Alice', project_name: 'FastBoard' },
    ]);
    vi.mocked(NotificationRepository.unreadCount).mockResolvedValue(1);

    const result = await NotificationService.list('user-2');

    expect(result.items).toHaveLength(1);
    expect(result.unread).toBe(1);
  });
});
