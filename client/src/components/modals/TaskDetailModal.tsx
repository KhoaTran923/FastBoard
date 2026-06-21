import { useState, type FormEvent } from 'react';
import { Modal } from '../common/Modal';
import { Button, Field, Input } from '../common/ui';
import { apiErrorMessage } from '../../services/http';
import { useBoardStore } from '../../stores/boardStore';
import type { Task, TaskPriority } from '../../types';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const fieldClass =
  'w-full rounded-md border border-medium-grey/25 bg-transparent px-4 py-2 text-[13px] text-black focus:border-purple focus:outline-none dark:text-white';

export function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const columns = useBoardStore((s) => s.activeBoard?.columns ?? []);
  const members = useBoardStore((s) => s.members);
  const updateTask = useBoardStore((s) => s.updateTask);
  const deleteTask = useBoardStore((s) => s.deleteTask);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [priority, setPriority] = useState<TaskPriority | ''>(task.priority ?? '');
  const [columnId, setColumnId] = useState(task.column_id);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? '');
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 10) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
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
      <form onSubmit={handleSave} className="space-y-5">
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

        <div className="grid grid-cols-2 gap-4">
          <Field label="Assignee">
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className={fieldClass}
            >
              <option value="" className="text-black">
                Unassigned
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id} className="text-black">
                  {m.email}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Due date">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="submit" fullWidth disabled={busy}>
            {busy ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={busy}>
            Delete
          </Button>
        </div>
      </form>
    </Modal>
  );
}
