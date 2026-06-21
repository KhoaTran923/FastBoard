import { Logo } from './common/Logo';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '../stores/authStore';
import { useBoardStore } from '../stores/boardStore';

function BoardIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M0 2.889A2.889 2.889 0 0 1 2.889 0H13.11A2.889 2.889 0 0 1 16 2.889V13.11A2.888 2.888 0 0 1 13.111 16H2.89A2.889 2.889 0 0 1 0 13.111V2.89Zm1.333 5.555v4.667c0 .859.697 1.556 1.556 1.556h6.889V8.444H1.333Zm8.445-1.333V1.333h-6.89A1.556 1.556 0 0 0 1.334 2.89V7.11h8.445Zm4.889-1.333H11.11v4.444h3.556V5.778Zm0-1.334V2.89a1.555 1.555 0 0 0-1.556-1.556h-2v3.111h3.556Zm0 7.112H11.11v3.11h2a1.556 1.556 0 0 0 1.556-1.555v-1.555Z" />
    </svg>
  );
}

interface SidebarProps {
  onCreateBoard: () => void;
  onHide: () => void;
}

export function Sidebar({ onCreateBoard, onHide }: SidebarProps) {
  const status = useAuthStore((s) => s.status);
  const boards = useBoardStore((s) => s.boards);
  const activeBoardId = useBoardStore((s) => s.activeBoardId);
  const selectBoard = useBoardStore((s) => s.selectBoard);

  const authed = status === 'authenticated';

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-lines-light bg-white dark:border-lines-dark dark:bg-dark-grey">
      <div className="px-6 py-5">
        <Logo />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <p className="px-6 pb-4 text-xs font-bold uppercase tracking-[2.4px] text-medium-grey">
          {authed ? `All Boards (${boards.length})` : 'No Boards'}
        </p>

        <nav className="pr-6">
          {boards.map((board) => {
            const isActive = board.id === activeBoardId;
            return (
              <button
                key={board.id}
                onClick={() => selectBoard(board.id)}
                className={`flex w-full items-center gap-3 rounded-r-full py-3.5 pl-6 text-left text-[15px] font-bold transition-colors ${
                  isActive
                    ? 'bg-purple text-white'
                    : 'text-medium-grey hover:bg-purple/10 hover:text-purple dark:hover:bg-white'
                }`}
              >
                <BoardIcon />
                <span className="truncate">{board.name}</span>
              </button>
            );
          })}

          <button
            onClick={onCreateBoard}
            className="flex w-full items-center gap-3 rounded-r-full py-3.5 pl-6 text-left text-[15px] font-bold text-purple hover:bg-purple/10 dark:hover:bg-white"
          >
            <BoardIcon />
            <span>+ Create New Board</span>
          </button>
        </nav>
      </div>

      <div className="space-y-4 px-4 pb-7">
        <ThemeToggle />
        <button
          onClick={onHide}
          className="flex items-center gap-3 px-2 text-[15px] font-bold text-medium-grey hover:text-purple"
        >
          <svg width="18" height="16" viewBox="0 0 18 16" fill="currentColor" aria-hidden>
            <path d="M8.522 11.223a4.252 4.252 0 0 1-3.654-5.22l3.654 5.22ZM9 12.25A8.685 8.685 0 0 1 1.5 8a8.612 8.612 0 0 1 2.76-2.864l-.86-1.23A10.112 10.112 0 0 0 .208 7.238a1.5 1.5 0 0 0 0 1.524A10.187 10.187 0 0 0 9 13.75c.414 0 .828-.025 1.239-.074l-1-1.43A.601.601 0 0 1 9 12.25Zm8.792-3.488a10.14 10.14 0 0 1-4.486 4.046l1.504 2.148a.375.375 0 0 1-.092.523l-.648.453a.375.375 0 0 1-.523-.092L3.19 1.044A.375.375 0 0 1 3.282.52L3.93.068a.375.375 0 0 1 .523.092l1.293 1.846A10.174 10.174 0 0 1 9 1.75c4.024 0 7.585 2.475 8.792 5.488a1.5 1.5 0 0 1 0 1.524ZM16.5 8a8.674 8.674 0 0 0-6.755-4.219A1.75 1.75 0 1 0 12.75 8c0-.169-.024-.336-.07-.498l-.875-1.25 1.045 1.493L16.5 8Z" />
          </svg>
          Hide Sidebar
        </button>
      </div>
    </aside>
  );
}
