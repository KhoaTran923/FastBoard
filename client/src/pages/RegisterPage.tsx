import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthCard, OrDivider } from '../components/common/AuthCard';
import { GoogleButton } from '../components/common/GoogleButton';
import { PasswordInput } from '../components/common/PasswordInput';
import { Button, Field, Input } from '../components/common/ui';
import { firstIssue, registerSchema } from '../lib/validation';
import { apiErrorMessage } from '../services/http';
import { useAuthStore } from '../stores/authStore';

export function RegisterPage() {
  const { register, status } = useAuthStore();
  const navigate = useNavigate();
  // Where to land after signup (e.g. an invite link that required an account)
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = firstIssue(registerSchema, {
      full_name: fullName,
      email,
      password,
      confirm,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await register({ full_name: fullName, email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Create your account to start streamlining your workflow with our powerful Kanban application."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field label="Name">
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your name here"
            autoComplete="name"
            required
          />
        </Field>

        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email here"
            autoComplete="email"
            required
          />
        </Field>

        <Field label="Password">
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Must be at least 8 characters"
            autoComplete="new-password"
            required
          />
        </Field>

        <Field label="Confirm Password">
          <PasswordInput
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Please confirm your password"
            autoComplete="new-password"
            required
          />
        </Field>

        {error && <p className="text-sm font-medium text-red">{error}</p>}

        <p className="text-sm text-black dark:text-white">
          Already have an account with us?{' '}
          <Link to="/login" state={{ from }} className="font-bold text-purple hover:underline">
            Login
          </Link>
        </p>

        <Button type="submit" size="lg" fullWidth disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create Your Account'}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton />
    </AuthCard>
  );
}
