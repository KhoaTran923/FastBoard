import { useEffect, useState } from 'react';
import { Button, Spinner } from '../components/common/ui';
import { timeAgo } from '../lib/timeAgo';
import { getActivity } from '../services/boards';
import { apiErrorMessage } from '../services/http';
import { useBoardStore } from '../stores/boardStore';
import type { ActivityEntry } from '../types';

const PAGE_SIZE = 50;

/** Human-readable sentence for one history entry (actor name is prepended). */
function describe(entry: ActivityEntry): string {
  const meta = entry.metadata ?? {};
  const title = String(meta.title ?? '');
  switch (entry.action) {
    case 'task.created':
      return `created task “${title}”`;
    case 'task.updated':
      return `updated task “${title}”`;
    case 'task.completed':
      return `completed task “${title}”`;
    case 'task.reopened':
      return `reopened task “${title}”`;
    case 'task.moved':
      return `moved task “${title}” from ${String(meta.from ?? '?')} to ${String(meta.to ?? '?')}`;
    case 'task.deleted':
      return `deleted task “${title}”`;
    case 'board.created':
      return `created board “${String(meta.name ?? '')}”`;
    case 'board.renamed':
      return `renamed board “${String(meta.from ?? '')}” to “${String(meta.to ?? '')}”`;
    case 'board.deleted':
      return `deleted board “${String(meta.name ?? '')}”`;
    case 'column.created':
      return `added column “${String(meta.name ?? '')}”`;
    case 'column.renamed':
      return `renamed column “${String(meta.from ?? '')}” to “${String(meta.to ?? '')}”`;
    case 'column.deleted':
      return `deleted column “${String(meta.name ?? '')}”`;
    case 'member.added':
      return `added a member (${String(meta.role ?? 'member')})`;
    case 'member.joined':
      return `joined the project via invite link as ${String(meta.role ?? 'member')}`;
    case 'member.removed':
      return `removed a member`;
    case 'member.left':
      return `left the project`;
    case 'member.role_changed':
      return `changed a member role from ${String(meta.from ?? '?')} to ${String(meta.to ?? '?')}`;
    default:
      return entry.action;
  }
}

const DOT_BY_TYPE: Record<string, string> = {
  task: 'bg-purple',
  board: 'bg-[#49C4E5]',
  column: 'bg-[#E5A449]',
  project: 'bg-[#67E2AE]',
};

export function ActivityPage() {
  const workspaceId = useBoardStore((s) => s.workspaceId);

  // null = first page still loading
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  // Bumped by the Refresh button to re-run the fetch effect
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    getActivity(workspaceId, PAGE_SIZE)
      .then((page) => {
        if (!active) return;
        setEntries(page);
        setHasMore(page.length === PAGE_SIZE);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setEntries([]);
        setError(apiErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [workspaceId, reloadKey]);

  function refresh() {
    setEntries(null);
    setReloadKey((k) => k + 1);
  }

  async function loadMore() {
    if (!workspaceId || !entries || entries.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = entries[entries.length - 1].created_at;
      const page = await getActivity(workspaceId, PAGE_SIZE, oldest);
      setEntries((prev) => [...(prev ?? []), ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  if (entries === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="text-purple" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-black dark:text-white">Project Activity</h2>
          <Button variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        </div>

        {error && <p className="mb-4 text-sm font-medium text-red">{error}</p>}

        {entries.length === 0 && !error && (
          <p className="py-12 text-center text-sm text-medium-grey">
            No activity yet. Changes to boards, columns, tasks, and members will show up here.
          </p>
        )}

        <ol className="space-y-1">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start gap-3 rounded-lg bg-white px-4 py-3 dark:bg-dark-grey"
            >
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  DOT_BY_TYPE[entry.entity_type] ?? 'bg-medium-grey'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug text-black dark:text-white">
                  <span className="font-bold">
                    {entry.user_name ?? entry.user_email ?? 'Someone'}
                  </span>{' '}
                  {describe(entry)}
                </p>
                <p className="mt-0.5 text-xs text-medium-grey">{timeAgo(entry.created_at)}</p>
              </div>
            </li>
          ))}
        </ol>

        {hasMore && (
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
