import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoMark } from './common/Logo';
import { SearchBar } from './SearchBar';
import { Button } from './common/ui';
import { useAuthStore } from '../stores/authStore';
import { useBoardStore } from '../stores/boardStore';

interface HeaderProps {
  onAddTask: () => void;
  sidebarHidden: boolean;
}

export function Header({ onAddTask, sidebarHidden }: HeaderProps) {
  const { user, logout, status } = useAuthStore();
  const activeBoard = useBoardStore((s) => s.activeBoard);
  const resetBoards = useBoardStore((s) => s.reset);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const authed = status === 'authenticated';

  function handleLogout() {
    logout();
    resetBoards();
    setMenuOpen(false);
    navigate('/', { replace: true });
  }

  return (
    <header className="grid h-20 shrink-0 grid-cols-3 items-center gap-4 border-b border-lines-light bg-white px-6 dark:border-lines-dark dark:bg-dark-grey">
      <div className="flex min-w-0 items-center gap-4">
        {sidebarHidden && <LogoMark />}
        <h1 className="truncate text-xl font-bold text-black dark:text-white">
          {activeBoard?.name ?? 'FastBoard'}
        </h1>
      </div>

      {/* Centered WASM-powered task search */}
      <div className="flex justify-center">{authed && activeBoard && <SearchBar />}</div>

      <div className="flex items-center justify-end gap-2">
        <Button onClick={onAddTask} disabled={!authed || !activeBoard}>
          + Add New Task
        </Button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            className="flex h-10 w-8 items-center justify-center text-medium-grey hover:text-purple"
          >
            <svg width="5" height="20" viewBox="0 0 5 20" fill="currentColor" aria-hidden>
              <circle cx="2.5" cy="2.5" r="2.5" />
              <circle cx="2.5" cy="10" r="2.5" />
              <circle cx="2.5" cy="17.5" r="2.5" />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-12 z-20 w-52 rounded-lg bg-white p-2 shadow-xl dark:bg-very-dark">
                {authed ? (
                  <>
                    <p className="truncate px-3 py-2 text-xs text-medium-grey">{user?.email}</p>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-md px-3 py-2 text-left text-sm font-bold text-red hover:bg-red/10"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/login');
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm font-bold text-purple hover:bg-purple/10"
                  >
                    Log in
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
