import { useMemo } from 'react';
import { Column } from './Column';
import { useWasm } from '../../hooks/useWasm';
import { useSearchStore } from '../../stores/searchStore';
import type { BoardDetail } from '../../types';

interface KanbanBoardProps {
  board: BoardDetail;
  onNewColumn: () => void;
}

export function KanbanBoard({ board, onNewColumn }: KanbanBoardProps) {
  const query = useSearchStore((s) => s.query);
  const { match } = useWasm();

  // Filter each column's tasks by the search query (WASM KMP, JS fallback).
  const columns = useMemo(
    () =>
      board.columns.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) =>
          match(`${task.title} ${task.description ?? ''}`, query)
        ),
      })),
    [board.columns, query, match]
  );

  const totalMatches = columns.reduce((sum, c) => sum + c.tasks.length, 0);

  if (query.trim() && totalMatches === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-lg font-bold text-medium-grey">No tasks match “{query}”.</p>
        <p className="text-sm text-medium-grey">Try a different search term.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6 overflow-auto p-6">
      {columns.map((column, index) => (
        <Column key={column.id} column={column} index={index} />
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
