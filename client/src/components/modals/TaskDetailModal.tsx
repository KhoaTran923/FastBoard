import { useState, type FormEvent } from 'react';
import { Modal } from '../common/Modal';
import { Button, Field, Input } from '../common/ui';
import { apiErrorMessage } from '../../services/http';
import { useBoardStore } from '../../stores/boardStore';
import type { Task, TaskPriority } from '../../types';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const fieldClass =
  'w-full rounded-md border border-medium-grey/25 bg-transparent px-4 py-2 text-[13px] text-black focus:border-purple focus:outline-none dark:text-white';

interface TaskDetailModalProps {
  task: Task;
  /** Viewer role: show everything, allow nothing. */
  readOnly?: boolean;
  onClose: () => void;
}

export function TaskDetailModal({ task, readOnly = false, onClose }: TaskDetailModalProps) {
  const columns = useBoardStore((s) => s.activeBoard?.columns ?? []);
  const members = useBoardStore((s) => s.members);
  const updateTask = useBoardStore((s) => s.updateTask);
  const deleteTask = useBoardStore((s) => s.deleteTask);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [priority, setPriority] = useState<TaskPriority | ''>(task.priority ?? '');
  const [columnId, setColumnId] = useState(task.column_id);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assignees ?? []);
  const [adding, setAdding] = useState(false);
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 10) : '');
  const [completed, setCompleted] = useState(Boolean(task.completed_at));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const available = members.filter((m) => !assigneeIds.includes(m.id));

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority: priority || null,
        column_id: columnId,
        assignee_ids: assigneeIds,
        due_date: dueDate || null,
        // Only send the flag when it changed so re-saves keep the original date
        ...(completed !== Boolean(task.completed_at) ? { completed } : {}),
      });
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setBusy(true);
    try {
      await deleteTask(task.id);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="Task Details" onClose={onClose}>
      <form onSubmit={handleSave}>
        {/* fieldset disables every nested input for viewers in one place */}
        <fieldset disabled={readOnly} className="space-y-5">
          <Field label="Title" error={error}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} invalid={!!error} />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description…"
              rows={3}
              className={`${fieldClass} resize-none placeholder:text-black/35 dark:placeholder:text-white/30`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className={fieldClass}
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id} className="text-black">
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Priority">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority | '')}
                className={fieldClass}
              >
                <option value="" className="text-black">
                  None
                </option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className="text-black">
                    {p[0].toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Assignees">
            <div className="space-y-2">
              {assigneeIds.length === 0 && (
                <p className="text-xs text-medium-grey">No one assigned yet.</p>
              )}
              {assigneeIds.map((id) => {
                const member = members.find((m) => m.id === id);
                const email = member?.email ?? 'Unknown user';
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 rounded-md border border-medium-grey/20 px-3 py-1.5"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple/20 text-[10px] font-bold uppercase text-purple">
                      {email[0]}
                    </span>
                    <span className="flex-1 truncate text-[13px] text-black dark:text-white">
                      {email}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAssigneeIds((ids) => ids.filter((x) => x !== id))}
                      aria-label={`Remove ${email}`}
                      className="text-medium-grey hover:text-red"
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
                  </div>
                );
              })}

              {available.length > 0 ? (
                adding ? (
                  <select
                    autoFocus
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setAssigneeIds((ids) => [...ids, e.target.value]);
                      setAdding(false);
                    }}
                    onBlur={() => setAdding(false)}
                    className={fieldClass}
                  >
                    <option value="">Select a member…</option>
                    {available.map((m) => (
                      <option key={m.id} value={m.id} className="text-black">
                        {m.email}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-bold text-purple hover:bg-purple/10"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add assignee
                  </button>
                )
              ) : (
                assigneeIds.length > 0 && (
                  <p className="text-xs text-medium-grey">All members are assigned.</p>
                )
              )}
            </div>
          </Field>

          <Field label="Due date">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={fieldClass}
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-medium-grey/20 px-4 py-2.5">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
              className="h-4 w-4 accent-purple"
            />
            <span className="text-[13px] font-bold text-black dark:text-white">
              {completed ? 'Completed' : 'Mark as complete'}
            </span>
            {task.completed_at && completed && (
              <span className="ml-auto text-xs text-medium-grey">
                since {new Date(task.completed_at).toLocaleDateString()}
              </span>
            )}
          </label>

          {!readOnly && (
            <div className="flex gap-3 pt-1">
              <Button type="submit" fullWidth disabled={busy}>
                {busy ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={busy}>
                Delete
              </Button>
            </div>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}
