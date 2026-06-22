import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/ui';
import { apiErrorMessage } from '../../services/http';
import { searchUsers } from '../../services/users';
import { useBoardStore } from '../../stores/boardStore';
import type { User } from '../../types';

export function AddMemberModal({ onClose }: { onClose: () => void }) {
  const members = useBoardStore((s) => s.members);
  const addMember = useBoardStore((s) => s.addMember);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);

  const memberIds = new Set(members.map((m) => m.id));

  useEffect(() => {
    const term = query.trim();
    if (!term) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      searchUsers(term)
        .then((users) => active && setResults(users))
        .catch((err) => active && setError(apiErrorMessage(err)))
        .finally(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  async function handleAdd(user: User) {
    setAddingId(user.id);
    setError('');
    try {
      await addMember(user.id);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setAddingId(null);
    }
  }

  return (
    <Modal title="Add assignee to project" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-medium-grey">
          Search people by email to add them to this project — they become assignable on tasks.
        </p>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email…"
          autoFocus
        />

        {error && <p className="text-sm font-medium text-red">{error}</p>}

        <div className="max-h-60 space-y-1 overflow-y-auto">
          {query.trim() && loading && (
            <p className="px-1 py-2 text-sm text-medium-grey">Searching…</p>
          )}
          {query.trim() && !loading && results.length === 0 && (
            <p className="px-1 py-2 text-sm text-medium-grey">No users found.</p>
          )}
          {query.trim() &&
            !loading &&
            results.map((u) => {
              const already = memberIds.has(u.id);
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-medium-grey/5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple/20 text-xs font-bold uppercase text-purple">
                    {u.email[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-black dark:text-white">
                      {u.email}
                    </p>
                    <p className="truncate text-xs text-medium-grey">{u.full_name}</p>
                  </div>
                  {already ? (
                    <span className="text-xs font-bold text-medium-grey">Added</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAdd(u)}
                      disabled={addingId === u.id}
                      className="rounded-full bg-purple px-3 py-1 text-xs font-bold text-white hover:bg-purple-hover disabled:opacity-50"
                    >
                      {addingId === u.id ? 'Adding…' : 'Add'}
                    </button>
                  )}
                </div>
              );
            })}
        </div>

        <div>
          <p className="mb-2 text-xs font-bold text-medium-grey">
            Current members ({members.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => (
              <span
                key={m.id}
                className="rounded-full bg-medium-grey/10 px-2.5 py-1 text-xs text-medium-grey"
                title={m.email}
              >
                {m.email}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
