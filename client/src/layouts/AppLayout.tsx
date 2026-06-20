import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { AddTaskModal } from '../components/modals/AddTaskModal';
import { BoardFormModal } from '../components/modals/BoardFormModal';
import { TextPromptModal } from '../components/modals/TextPromptModal';
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
  const { activeBoard, createBoard, addColumn, addTask } = useBoardStore();

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
          <Outlet context={context} />
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
      {modal === 'addTask' && activeBoard && (
        <AddTaskModal columns={activeBoard.columns} onClose={close} onSubmit={addTask} />
      )}
    </div>
  );
}
