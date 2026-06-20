import { TaskCard } from './TaskCard';
import type { BoardDetail, ColumnWithTasks } from '../types';

const DOT_COLORS = ['#49C4E5', '#8471F2', '#67E2AE', '#E5A449', '#E5497E', '#49E5C4'];

function ColumnView({ column, index }: { column: ColumnWithTasks; index: number }) {
  return (
    <div className="w-[280px] shrink-0">
      <div className="mb-6 flex items-center gap-3">
        <span
          className="inline-block h-4 w-4 rounded-full"
          style={{ backgroundColor: DOT_COLORS[index % DOT_COLORS.length] }}
        />
        <h3 className="text-xs font-bold uppercase tracking-[2.4px] text-medium-grey">
          {column.name} ({column.tasks.length})
        </h3>
      </div>
      <div className="space-y-5">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

interface BoardProps {
  board: BoardDetail;
  onNewColumn: () => void;
}

export function Board({ board, onNewColumn }: BoardProps) {
  return (
    <div className="flex h-full gap-6 overflow-auto p-6">
      {board.columns.map((column, index) => (
        <ColumnView key={column.id} column={column} index={index} />
      ))}

      <button
        onClick={onNewColumn}
        className="mt-[39px] flex h-[calc(100%-39px)] w-[280px] shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-black/[0.03] to-black/[0.01] text-xl font-bold text-medium-grey transition-colors hover:text-purple dark:from-dark-grey/40 dark:to-dark-grey/10"
      >
        + New Column
      </button>
    </div>
  );
}
