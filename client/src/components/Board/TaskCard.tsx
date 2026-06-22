import { useBoardStore } from '../../stores/boardStore';
import type { Member, Task } from '../../types';

// Priority badge colours (background tint + text).
const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-[#67E2AE]/20 text-[#1f8a4c]',
  medium: 'bg-[#E5A449]/20 text-[#a96a00]',
  high: 'bg-[#E5497E]/20 text-[#c92a64]',
  urgent: 'bg-red/15 text-red',
};

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

function formatDueDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Avatar({ email }: { email: string }) {
  // First-letter avatar for now; swap for a Gravatar image later.
  return (
    <span
      title={email}
      className="flex h-7 w-7 items-center justify-center rounded-full bg-purple/20 text-[11px] font-bold uppercase text-purple ring-2 ring-white dark:ring-dark-grey"
    >
      {email[0]}
    </span>
  );
}

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const members = useBoardStore((s) => s.members);
  const assignees = (task.assignees ?? [])
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is Member => Boolean(m));

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg bg-white px-4 py-4 shadow-[0_4px_6px_rgba(54,78,126,0.1)] dark:bg-dark-grey"
    >
      <h4 className="font-bold text-black group-hover:text-purple dark:text-white">{task.title}</h4>

      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-medium-grey">{task.description}</p>
      )}

      {(task.priority || task.due_date) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {task.priority && (
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-bold ${PRIORITY_STYLES[task.priority]}`}
            >
              {capitalize(task.priority)}
            </span>
          )}
          {task.due_date && (
            <span className="flex items-center gap-1 text-xs font-medium text-medium-grey">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="16" y1="2" x2="16" y2="6" />
              </svg>
              {formatDueDate(task.due_date)}
            </span>
          )}
        </div>
      )}

      {assignees.length > 0 && (
        <div className="mt-3.5 flex items-center -space-x-2">
          {assignees.slice(0, 3).map((m) => (
            <Avatar key={m.id} email={m.email} />
          ))}
          {assignees.length > 3 && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-medium-grey/25 text-[10px] font-bold text-medium-grey ring-2 ring-white dark:ring-dark-grey">
              +{assignees.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
