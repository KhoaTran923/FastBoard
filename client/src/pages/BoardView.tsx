import type { ReactNode } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { KanbanBoard } from '../components/Board/KanbanBoard';
import { Button, Spinner } from '../components/common/ui';
import { useAuthStore } from '../stores/authStore';
import { useBoardStore } from '../stores/boardStore';
import type { BoardOutletContext } from '../layouts/AppLayout';

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      {children}
    </div>
  );
}

export function BoardView() {
  const authStatus = useAuthStore((s) => s.status);
  const status = useBoardStore((s) => s.status);
  const boards = useBoardStore((s) => s.boards);
  const activeBoard = useBoardStore((s) => s.activeBoard);
  const boardLoading = useBoardStore((s) => s.boardLoading);
  const offline = useBoardStore((s) => s.offline);
  const init = useBoardStore((s) => s.init);
  const { openCreateBoard, openNewColumn } = useOutletContext<BoardOutletContext>();
  const navigate = useNavigate();

  // Not signed in
  if (authStatus !== 'authenticated') {
    return (
      <Centered>
        <p className="text-lg font-bold text-medium-grey">Please sign in to enjoy the Kanban app</p>
        <Button size="lg" onClick={() => navigate('/login')}>
          Login Now
        </Button>
      </Centered>
    );
  }

  // Loading boards
  if (status === 'idle' || status === 'loading') {
    return (
      <Centered>
        <Spinner className="text-purple" />
      </Centered>
    );
  }

  // Failed to load
  if (status === 'error') {
    return (
      <Centered>
        <p className="text-lg font-bold text-medium-grey">Couldn&apos;t load your boards.</p>
        <Button size="lg" onClick={() => void init()}>
          Try again
        </Button>
      </Centered>
    );
  }

  // No boards yet
  if (boards.length === 0) {
    return (
      <Centered>
        <p className="max-w-sm text-lg font-bold text-medium-grey">
          You don&apos;t have any boards yet. Create a new board to get started.
        </p>
        <Button size="lg" onClick={openCreateBoard}>
          + Create New Board
        </Button>
      </Centered>
    );
  }

  // Active board not yet loaded
  if (!activeBoard || boardLoading) {
    return (
      <Centered>
        <Spinner className="text-purple" />
      </Centered>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {offline && (
        <div className="shrink-0 bg-[#E5A449]/15 px-6 py-2 text-center text-xs font-bold text-[#a06a1b]">
          Offline — showing your last saved board. Changes are disabled until the connection
          returns.
        </div>
      )}
      <div className="min-h-0 flex-1">
        <KanbanBoard board={activeBoard} onNewColumn={openNewColumn} readOnly={offline} />
      </div>
    </div>
  );
}
