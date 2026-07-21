import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Logo } from '../components/common/Logo';
import { Button, Spinner } from '../components/common/ui';
import { apiErrorMessage } from '../services/http';
import { acceptInvite, getInvitePreview } from '../services/invites';
import { useAuthStore } from '../stores/authStore';
import { useBoardStore } from '../stores/boardStore';
import type { InvitePreview } from '../types';

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const authStatus = useAuthStore((s) => s.status);
  const switchWorkspace = useBoardStore((s) => s.switchWorkspace);
  const navigate = useNavigate();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !token) return;
    getInvitePreview(token)
      .then(setPreview)
      .catch((err) => setError(apiErrorMessage(err)));
  }, [authStatus, token]);

  // Wait for the session restore before deciding where to send the user
  if (authStatus === 'idle' || authStatus === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="text-purple" />
      </div>
    );
  }

  // Signed out: log in first, then come back to this invite
  if (authStatus === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: `/invite/${token}` }} replace />;
  }

  async function handleAccept() {
    if (!token) return;
    setJoining(true);
    setError('');
    try {
      const { project_id } = await acceptInvite(token);
      await switchWorkspace(project_id);
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
      setJoining(false);
    }
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-8 bg-light-grey px-6 dark:bg-very-dark">
      <Logo />
      <div className="w-full max-w-md space-y-5 rounded-xl bg-white p-8 text-center shadow-lg dark:bg-dark-grey">
        {error && <p className="text-sm font-medium text-red">{error}</p>}

        {!preview && !error && <Spinner className="mx-auto text-purple" />}

        {preview && (
          <>
            <h1 className="text-xl font-bold text-black dark:text-white">
              Join “{preview.project_name}”
            </h1>
            <p className="text-sm text-medium-grey">
              {preview.inviter_name ?? 'A teammate'} invited you to join as{' '}
              <span className="font-bold text-purple">{preview.role}</span>.
            </p>

            {preview.expired ? (
              <p className="text-sm font-medium text-red">
                This invite link has expired. Ask for a new one.
              </p>
            ) : preview.already_member ? (
              <>
                <p className="text-sm text-medium-grey">You are already a member.</p>
                <Button size="lg" fullWidth onClick={() => navigate('/')}>
                  Open the board
                </Button>
              </>
            ) : (
              <Button size="lg" fullWidth onClick={handleAccept} disabled={joining}>
                {joining ? 'Joining…' : 'Accept invite'}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
