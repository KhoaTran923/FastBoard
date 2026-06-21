import { useState, type FormEvent } from 'react';
import { Modal } from '../common/Modal';
import { Button, Field, Input } from '../common/ui';
import { apiErrorMessage } from '../../services/http';

interface BoardFormModalProps {
  onClose: () => void;
  onSubmit: (name: string, columns: string[]) => Promise<void>;
}

interface ColumnField {
  id: string;
  value: string;
}

const newField = (value = ''): ColumnField => ({ id: crypto.randomUUID(), value });

export function BoardFormModal({ onClose, onSubmit }: BoardFormModalProps) {
  const [name, setName] = useState('');
  const [columns, setColumns] = useState<ColumnField[]>([newField('Todo'), newField('Doing')]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateColumn = (id: string, value: string) =>
    setColumns((cols) => cols.map((c) => (c.id === id ? { ...c, value } : c)));
  const removeColumn = (id: string) => setColumns((cols) => cols.filter((c) => c.id !== id));
  const addColumnField = () => setColumns((cols) => [...cols, newField()]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Board name is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(
        name.trim(),
        columns.map((c) => c.value)
      );
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add New Board" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Board Name" error={error}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Web Design"
            invalid={!!error}
            autoFocus
          />
        </Field>

        <div>
          <span className="mb-2 block text-xs font-bold text-medium-grey">Board Columns</span>
          <div className="space-y-3">
            {columns.map((column) => (
              <div key={column.id} className="flex items-center gap-3">
                <Input
                  value={column.value}
                  onChange={(e) => updateColumn(column.id, e.target.value)}
                  placeholder="e.g. Todo"
                />
                <button
                  type="button"
                  onClick={() => removeColumn(column.id)}
                  aria-label="Remove column"
                  className="shrink-0 text-medium-grey hover:text-red"
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor" aria-hidden>
                    <rect x="12.728" width="3" height="18" rx="1" transform="rotate(45 12.728 0)" />
                    <rect y="2.122" width="3" height="18" rx="1" transform="rotate(-45 0 2.122)" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="mt-3"
            onClick={addColumnField}
          >
            + Add New Column
          </Button>
        </div>

        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Creating…' : 'Create New Board'}
        </Button>
      </form>
    </Modal>
  );
}
