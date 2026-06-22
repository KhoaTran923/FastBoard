import { useState, type FormEvent } from 'react';
import { Modal } from '../common/Modal';
import { Button, Field, Input } from '../common/ui';
import { apiErrorMessage } from '../../services/http';

interface TextPromptModalProps {
  title: string;
  label: string;
  placeholder?: string;
  submitLabel: string;
  initialValue?: string;
  onClose: () => void;
  onSubmit: (value: string) => Promise<void> | void;
}

export function TextPromptModal({
  title,
  label,
  placeholder,
  submitLabel,
  initialValue = '',
  onClose,
  onSubmit,
}: TextPromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      setError('This field is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(value.trim());
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label={label} error={error}>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            invalid={!!error}
            autoFocus
          />
        </Field>
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </form>
    </Modal>
  );
}
