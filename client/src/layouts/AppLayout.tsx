import { Suspense, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { Spinner } from '../components/common/ui';
import { AddTaskModal } from '../components/modals/AddTaskModal';
import { BoardFormModal } from '../components/modals/BoardFormModal';
import { TextPromptModal } from '../components/modals/TextPromptModal';
import { useBoardSync } from '../hooks/useBoardSync';
import { useNotifications } from '../hooks/useNotifications';
import { useAuthStore } from '../stores/authStore';
import { useBoardStore } from '../stores/boardStore';

export interface BoardOutletContext {
  openCreateBoard: () => void;
  openNewColumn: () => void;
}

type ModalKind = null | 'createBoard' | 'newColumn' | 'addTask';

export function AppLayout() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [modal, setModal] = useState<ModalKind>(null);

  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();
  // Selective subscriptions: a whole-store hook would re-render the entire
  // layout (header + sidebar) on every task change
  const createBoard = useBoardStore((s) => s.createBoard);
  const addColumn = useBoardStore((s) => s.addColumn);
  const addTask = useBoardStore((s) => s.addTask);
  const boardStatus = useBoardStore((s) => s.status);

  // Load the workspace here (not in a page) so deep links to /activity or
  // /analytics work without visiting the board first
  useEffect(() => {
    if (status === 'authenticated' && boardStatus === 'idle') {
      void useBoardStore.getState().init();
    }
  }, [status, boardStatus]);

  // Mounted at the layout so every page receives realtime board events
  useBoardSync(useBoardStore((s) => s.activeBoardId));
  // Loads the notification list and applies realtime pushes
  useNotifications();

  const authed = status === 'authenticated';

  const openCreateBoard = () => (authed ? setModal('createBoard') : navigate('/login'));
  const openNewColumn = () => setModal('newColumn');
  const openAddTask = () => setModal('addTask');
  const close = () => setModal(null);

  const context: BoardOutletContext = { openCreateBoard, openNewColumn };

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarVisible && (
        <Sidebar onCreateBoard={openCreateBoard} onHide={() => setSidebarVisible(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onAddTask={openAddTask} sidebarHidden={!sidebarVisible} />
        <main className="min-h-0 flex-1 bg-light-grey dark:bg-very-dark">
          {/* Lazy page chunks load inside the layout, keeping the shell visible */}
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Spinner className="text-purple" />
              </div>
            }
          >
            <Outlet context={context} />
          </Suspense>
        </main>
      </div>

      {!sidebarVisible && (
        <button
          type="button"
          onClick={() => setSidebarVisible(true)}
          aria-label="Show sidebar"
          className="fixed bottom-8 left-0 z-30 flex h-12 w-14 items-center justify-center rounded-r-full bg-purple text-white hover:bg-purple-hover"
        >
          <svg
            width="18"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )}

      {modal === 'createBoard' && <BoardFormModal onClose={close} onSubmit={createBoard} />}
      {modal === 'newColumn' && (
        <TextPromptModal
          title="Add New Column"
          label="Column Name"
          placeholder="e.g. Todo"
          submitLabel="Create Column"
          onClose={close}
          onSubmit={addColumn}
        />
      )}
      {modal === 'addTask' && <AddTaskModalContainer onClose={close} onSubmit={addTask} />}
    </div>
  );
}

// Subscribes to columns only while the modal is open
function AddTaskModalContainer(props: {
  onClose: () => void;
  onSubmit: Parameters<typeof AddTaskModal>[0]['onSubmit'];
}) {
  const columns = useBoardStore((s) => s.activeBoard?.columns);
  if (!columns) return null;
  return <AddTaskModal columns={columns} {...props} />;
}
