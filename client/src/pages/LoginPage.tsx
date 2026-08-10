import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthCard, OrDivider } from '../components/common/AuthCard';
import { GoogleButton } from '../components/common/GoogleButton';
import { PasswordInput } from '../components/common/PasswordInput';
import { Button, Field, Input } from '../components/common/ui';
import { firstIssue, loginSchema } from '../lib/validation';
import { apiErrorMessage } from '../services/http';
import { useAuthStore } from '../stores/authStore';

export function LoginPage() {
  const { login, status } = useAuthStore();
  const navigate = useNavigate();
  // Where to land after login (e.g. an invite link that required sign-in)
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const issue = firstIssue(loginSchema, { email, password });
    if (issue) {
      setError(issue);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Welcome Back!"
      subtitle="Log in to your account to continue managing your projects and tasks seamlessly."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </Field>

        {error && <p className="text-sm font-medium text-red">{error}</p>}

        <p className="text-sm text-black dark:text-white">
          Don&apos;t have an account with us yet?{' '}
          <Link to="/register" state={{ from }} className="font-bold text-purple hover:underline">
            Create one now
          </Link>
        </p>

        <Button type="submit" size="lg" fullWidth disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log Into Your Account'}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton />
    </AuthCard>
  );
}
