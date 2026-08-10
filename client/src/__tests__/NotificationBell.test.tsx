import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from '../components/NotificationBell';
import { useNotificationStore } from '../stores/notificationStore';
import type { AppNotification } from '../types';

// The store persists reads through this service; the API is not under test
vi.mock('../services/notifications', () => ({
  getNotifications: vi.fn().mockResolvedValue({ items: [], unread: 0 }),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
}));

const notification: AppNotification = {
  id: 'n-1',
  user_id: 'me',
  actor_id: 'user-2',
  project_id: 'proj-1',
  type: 'task_assigned',
  metadata: { task_title: 'Fix login bug' },
  read_at: null,
  created_at: new Date().toISOString(),
  actor_name: 'Bob Carter',
  project_name: 'My Workspace',
};

beforeEach(() => {
  useNotificationStore.setState({ items: [notification], unread: 1, loaded: true });
});

describe('NotificationBell', () => {
  it('shows the unread count on the bell', () => {
    render(<NotificationBell />);
    expect(screen.getByLabelText('Notifications (1 unread)')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('opens the dropdown and renders a readable sentence', async () => {
    render(<NotificationBell />);
    await userEvent.click(screen.getByLabelText('Notifications (1 unread)'));
    expect(
      screen.getByText('Bob Carter assigned you “Fix login bug” in My Workspace')
    ).toBeInTheDocument();
  });

  it('clears the badge after "Mark all read"', async () => {
    render(<NotificationBell />);
    await userEvent.click(screen.getByLabelText('Notifications (1 unread)'));
    await userEvent.click(screen.getByText('Mark all read'));
    expect(useNotificationStore.getState().unread).toBe(0);
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });
});
