import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { BoardView } from './pages/BoardView';
import { Spinner } from './components/common/ui';
import { useAuthStore } from './stores/authStore';

// Route-level code splitting
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })));
const ActivityPage = lazy(() =>
  import('./pages/ActivityPage').then((m) => ({ default: m.ActivityPage }))
);
const InvitePage = lazy(() =>
  import('./pages/InvitePage').then((m) => ({ default: m.InvitePage }))
);
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);

function PageFallback() {
  return (
    <div className="flex h-full min-h-64 items-center justify-center">
      <Spinner className="text-purple" />
    </div>
  );
}

export default function App() {
  const loadSession = useAuthStore((s) => s.loadSession);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<BoardView />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/activity" element={<ActivityPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
