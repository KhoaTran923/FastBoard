import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/ui';
import { useMyRole } from '../../hooks/useMyRole';
import { apiErrorMessage } from '../../services/http';
import { createInvite, inviteUrl } from '../../services/invites';
import { searchUsers } from '../../services/users';
import { useAuthStore } from '../../stores/authStore';
import { useBoardStore } from '../../stores/boardStore';
import type { User, UserRole } from '../../types';

const ROLES: UserRole[] = ['admin', 'member', 'viewer'];

const roleLabel = (r: UserRole) => r[0].toUpperCase() + r.slice(1);

/** Admin-only block: mint an invite link and copy it to the clipboard. */
function InviteLinkSection() {
  const workspaceId = useBoardStore((s) => s.workspaceId);
  const [role, setRole] = useState<UserRole>('member');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    if (!workspaceId) return;
    setBusy(true);
    setError('');
    setCopied(false);
    try {
      const invite = await createInvite(workspaceId, role);
      setLink(inviteUrl(invite.token));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copy failed — select the link and copy it manually.');
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-medium-grey/20 p-3">
      <p className="text-xs font-bold text-medium-grey">Invite via link</p>
      <div className="flex items-center gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="rounded-md border border-medium-grey/25 bg-transparent px-2 py-1.5 text-[13px] text-black dark:text-white"
        >
          {ROLES.map((r) => (
            <option key={r} value={r} className="text-black">
              {roleLabel(r)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          className="rounded-full bg-purple px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-hover disabled:opacity-50"
        >
          {busy ? 'Generating…' : 'Generate link'}
        </button>
      </div>
      {link && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 rounded-md border border-medium-grey/25 bg-transparent px-2 py-1.5 text-xs text-black dark:text-white"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-full border border-purple px-3 py-1.5 text-xs font-bold text-purple hover:bg-purple/10"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
      <p className="text-[11px] text-medium-grey">
        Anyone with the link joins this project as {roleLabel(role).toLowerCase()}. Links expire
        after 7 days.
      </p>
      {error && <p className="text-xs font-medium text-red">{error}</p>}
    </div>
  );
}

export function ManageTeamModal({ onClose }: { onClose: () => void }) {
  const me = useAuthStore((s) => s.user);
  const members = useBoardStore((s) => s.members);
  const addMember = useBoardStore((s) => s.addMember);
  const updateMemberRole = useBoardStore((s) => s.updateMemberRole);
  const removeMember = useBoardStore((s) => s.removeMember);
  const isAdmin = useMyRole() === 'admin';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function run(id: string, fn: () => Promise<void>) {
    setBusyId(id);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal title="Team" onClose={onClose}>
      <div className="space-y-4">
        {isAdmin && <InviteLinkSection />}

        {isAdmin && (
          <div className="space-y-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Add people by email…"
            />
            {query.trim() && (
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {loading && <p className="px-1 py-2 text-sm text-medium-grey">Searching…</p>}
                {!loading && results.length === 0 && (
                  <p className="px-1 py-2 text-sm text-medium-grey">No users found.</p>
                )}
                {!loading &&
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
                            onClick={() => run(u.id, () => addMember(u.id))}
                            disabled={busyId === u.id}
                            className="rounded-full bg-purple px-3 py-1 text-xs font-bold text-white hover:bg-purple-hover disabled:opacity-50"
                          >
                            {busyId === u.id ? 'Adding…' : 'Add'}
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm font-medium text-red">{error}</p>}

        <div>
          <p className="mb-2 text-xs font-bold text-medium-grey">Members ({members.length})</p>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {members.map((m) => {
              const isSelf = m.id === me?.id;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-medium-grey/5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple/20 text-xs font-bold uppercase text-purple">
                    {m.email[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-black dark:text-white">
                      {m.full_name || m.email}
                      {isSelf && <span className="ml-1 text-xs text-medium-grey">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-medium-grey">{m.email}</p>
                  </div>

                  {isAdmin && !isSelf ? (
                    <>
                      <select
                        value={m.role}
                        disabled={busyId === m.id}
                        onChange={(e) =>
                          run(m.id, () => updateMemberRole(m.id, e.target.value as UserRole))
                        }
                        className="rounded-md border border-medium-grey/25 bg-transparent px-2 py-1 text-xs text-black dark:text-white"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r} className="text-black">
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Remove ${m.email} from this project?`)) {
                            void run(m.id, () => removeMember(m.id));
                          }
                        }}
                        disabled={busyId === m.id}
                        aria-label={`Remove ${m.email}`}
                        className="text-medium-grey hover:text-red disabled:opacity-50"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <line x1="6" y1="6" x2="18" y2="18" />
                          <line x1="18" y1="6" x2="6" y2="18" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <span className="rounded-full bg-medium-grey/10 px-2.5 py-1 text-xs font-bold text-medium-grey">
                      {roleLabel(m.role)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
