import { useAuthStore } from '../stores/authStore';
import { useBoardStore } from '../stores/boardStore';
import type { UserRole } from '../types';

/**
 * The signed-in user's role in the active workspace. Defaults to 'member'
 * until the member list has loaded; the server enforces the real permissions.
 */
export function useMyRole(): UserRole {
  const userId = useAuthStore((s) => s.user?.id);
  const members = useBoardStore((s) => s.members);
  if (!userId) return 'viewer';
  return members.find((m) => m.id === userId)?.role ?? 'member';
}
