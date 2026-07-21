import { useState } from 'react';
import { timeAgo } from '../lib/timeAgo';
import { useNotificationStore } from '../stores/notificationStore';
import type { AppNotification } from '../types';

/** Human-readable sentence for one notification. */
function describe(n: AppNotification): string {
  const actor = n.actor_name ?? 'Someone';
  const project = n.project_name ?? 'a project';
  const meta = n.metadata ?? {};
  switch (n.type) {
    case 'member_added':
      return `${actor} added you to ${project} as ${String(meta.role ?? 'member')}`;
    case 'role_changed':
      return `${actor} changed your role in ${project} to ${String(meta.role ?? 'member')}`;
    case 'task_assigned':
      return `${actor} assigned you “${String(meta.task_title ?? 'a task')}” in ${project}`;
    case 'invite_accepted':
      return `${actor} joined ${project} via your invite link`;
    default:
      return `${actor} did something in ${project}`;
  }
}

export function NotificationBell() {
  const items = useNotificationStore((s) => s.items);
  const unread = useNotificationStore((s) => s.unread);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-medium-grey hover:text-purple"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-20 w-80 rounded-lg bg-white shadow-xl dark:bg-very-dark">
            <div className="flex items-center justify-between border-b border-lines-light px-4 py-3 dark:border-lines-dark">
              <p className="text-sm font-bold text-black dark:text-white">Notifications</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="text-xs font-bold text-purple hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              {items.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-medium-grey">
                  Nothing here yet — you&apos;re all caught up.
                </p>
              )}
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void markRead(n.id)}
                  className={`block w-full rounded-md px-3 py-2.5 text-left hover:bg-purple/5 ${
                    n.read_at ? 'opacity-60' : ''
                  }`}
                >
                  <span className="flex items-start gap-2">
                    {!n.read_at && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-purple" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-[13px] leading-snug text-black dark:text-white">
                        {describe(n)}
                      </span>
                      <span className="mt-0.5 block text-xs text-medium-grey">
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
