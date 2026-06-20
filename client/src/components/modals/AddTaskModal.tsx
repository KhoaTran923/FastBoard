import { useState, type FormEvent } from 'react';
import { Modal } from '../Modal';
import { Button, Field, Input } from '../ui';
import { apiErrorMessage } from '../../lib/api';
import type { CreateTaskInput } from '../../api/boards';
import type { TaskPriority } from '../../types';

interface AddTaskModalProps {
  columns: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (columnId: string, input: CreateTaskInput) => Promise<void>;
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const fieldClass =
  'w-full rounded-md border border-medium-grey/25 bg-transparent px-4 py-2 text-[13px] text-black focus:border-purple focus:outline-none dark:text-white';

export function AddTaskModal({ columns, onClose, onSubmit }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [columnId, setColumnId] = useState(columns[0]?.id ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(columnId, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add New Task" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Title" error={error}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Take coffee break"
            invalid={!!error}
            autoFocus
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. It's always good to take a break."
            rows={3}
            className={`${fieldClass} resize-none placeholder:text-black/35 dark:placeholder:text-white/30`}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className={fieldClass}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p} className="text-black">
                  {p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </Field>

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
        </div>

        <Button type="submit" fullWidth disabled={submitting || columns.length === 0}>
          {submitting ? 'Creating…' : 'Create Task'}
        </Button>
      </form>
    </Modal>
  );
}
