import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { ActivityPage } from './pages/ActivityPage';
import { Analytics } from './pages/Analytics';
import { BoardView } from './pages/BoardView';
import { InvitePage } from './pages/InvitePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { useAuthStore } from './stores/authStore';

export default function App() {
  const loadSession = useAuthStore((s) => s.loadSession);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
