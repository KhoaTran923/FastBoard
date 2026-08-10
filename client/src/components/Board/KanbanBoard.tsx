import { useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { BoardColumn } from './BoardColumn';
import { TaskCard } from './TaskCard';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { useMyRole } from '../../hooks/useMyRole';
import { useWasm } from '../../hooks/useWasm';
import { useBoardStore } from '../../stores/boardStore';
import { useSearchStore } from '../../stores/searchStore';
import type { BoardDetail, Task } from '../../types';

interface KanbanBoardProps {
  board: BoardDetail;
  onNewColumn: () => void;
  /** Force read-only regardless of role (offline snapshot mode). */
  readOnly?: boolean;
}

function NewColumnButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-9.75 flex h-[calc(100%-39px)] w-70 shrink-0 items-center justify-center rounded-md bg-linear-to-b from-black/3 to-black/1 text-xl font-bold text-medium-grey transition-colors hover:text-purple dark:from-dark-grey/40 dark:to-dark-grey/10"
    >
      + New Column
    </button>
  );
}

export function KanbanBoard({ board, onNewColumn, readOnly = false }: KanbanBoardProps) {
  const query = useSearchStore((s) => s.query);
  const { match } = useWasm();
  const moveTask = useBoardStore((s) => s.moveTask);
  const renameColumn = useBoardStore((s) => s.renameColumn);
  const deleteColumn = useBoardStore((s) => s.deleteColumn);
  const role = useMyRole();
  // Viewers and offline snapshots get a read-only board: no dragging, no edits
  const canEdit = !readOnly && role !== 'viewer';

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  // Stable callbacks so memo(BoardColumn) skips unchanged columns
  const handleRenameColumn = useCallback(
    (columnId: string, name: string) => void renameColumn(columnId, name),
    [renameColumn]
  );
  const handleDeleteColumn = useCallback(
    (columnId: string) => void deleteColumn(columnId),
    [deleteColumn]
  );

  // A small drag threshold lets a plain click still open the task detail modal.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columns = board.columns;
  const searching = query.trim().length > 0;

  const findColumn = (id: string) =>
    columns.find((c) => c.id === id || c.tasks.some((t) => t.id === id));

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    setActiveTask(columns.flatMap((c) => c.tasks).find((t) => t.id === id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const source = findColumn(activeId);
    const target = findColumn(overId);
    if (!source || !target) return;

    // Dropped on a task → take its slot; dropped on the column → append.
    const overTaskIndex = target.tasks.findIndex((t) => t.id === overId);
    const toIndex = overTaskIndex >= 0 ? overTaskIndex : target.tasks.length;
    void moveTask(activeId, target.id, toIndex);
  }

  const detailModal = detailTask && (
    <TaskDetailModal task={detailTask} readOnly={!canEdit} onClose={() => setDetailTask(null)} />
  );

  // While searching: read-only, filtered (WASM) view — dragging is disabled.
  const filtered = useMemo(
    () =>
      columns.map((c) => ({
        ...c,
        tasks: c.tasks.filter((t) => match(`${t.title} ${t.description ?? ''}`, query)),
      })),
    [columns, query, match]
  );

  if (searching || !canEdit) {
    const shown = searching ? filtered : columns;
    const total = shown.reduce((sum, c) => sum + c.tasks.length, 0);
    if (searching && total === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-lg font-bold text-medium-grey">No tasks match “{query}”.</p>
          <p className="text-sm text-medium-grey">Try a different search term.</p>
        </div>
      );
    }
    return (
      <div className="flex h-full gap-6 overflow-x-auto overflow-y-hidden p-6">
        {shown.map((c, i) => (
          <BoardColumn
            key={c.id}
            column={c}
            index={i}
            sortable={false}
            canEdit={canEdit}
            onTaskClick={setDetailTask}
            onRename={handleRenameColumn}
            onDelete={handleDeleteColumn}
          />
        ))}
        {canEdit && <NewColumnButton onClick={onNewColumn} />}
        {detailModal}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-6 overflow-x-auto overflow-y-hidden p-6">
        {columns.map((c, i) => (
          <BoardColumn
            key={c.id}
            column={c}
            index={i}
            sortable
            canEdit
            onTaskClick={setDetailTask}
            onRename={handleRenameColumn}
            onDelete={handleDeleteColumn}
          />
        ))}
        <NewColumnButton onClick={onNewColumn} />
      </div>
      <DragOverlay>{activeTask ? <TaskCard task={activeTask} /> : null}</DragOverlay>
      {detailModal}
    </DndContext>
  );
}
