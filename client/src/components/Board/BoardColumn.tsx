import { memo, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SortableTask } from './SortableTask';
import { TaskCard } from './TaskCard';
import type { ColumnWithTasks, Task } from '../../types';

const DOT_COLORS = ['#49C4E5', '#8471F2', '#67E2AE', '#E5A449', '#E5497E', '#49E5C4'];

// Columns with at least this many tasks render through the virtualizer;
// below it the plain list keeps dnd-kit's reorder animations smooth.
const VIRTUALIZE_FROM = 50;
const ESTIMATED_CARD_PX = 100;
const CARD_GAP_PX = 20;

interface BoardColumnProps {
  column: ColumnWithTasks;
  index: number;
  /** When true, tasks are draggable/sortable; when false (search), read-only. */
  sortable: boolean;
  /** When false (viewer role), the rename/delete menu is hidden. */
  canEdit: boolean;
  onTaskClick: (task: Task) => void;
  onRename: (columnId: string, name: string) => void;
  onDelete: (columnId: string) => void;
}

/** Windowed task list: only the cards in view (plus overscan) are mounted. */
function VirtualTaskList({
  tasks,
  sortable,
  scrollRef,
  onTaskClick,
}: {
  tasks: Task[];
  sortable: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onTaskClick: (task: Task) => void;
}) {
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_CARD_PX + CARD_GAP_PX,
    overscan: 8,
  });

  return (
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map((item) => {
        const task = tasks[item.index];
        return (
          <div
            key={task.id}
            ref={virtualizer.measureElement}
            data-index={item.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${item.start}px)`,
              paddingBottom: CARD_GAP_PX,
            }}
          >
            {sortable ? (
              <SortableTask task={task} onSelect={onTaskClick} />
            ) : (
              <TaskCard task={task} onClick={() => onTaskClick(task)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export const BoardColumn = memo(function BoardColumn({
  column,
  index,
  sortable,
  canEdit,
  onTaskClick,
  onRename,
  onDelete,
}: BoardColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);

  const virtualized = column.tasks.length >= VIRTUALIZE_FROM;

  function commitRename() {
    const trimmed = name.trim();
    setEditing(false);
    if (trimmed && trimmed !== column.name) onRename(column.id, trimmed);
    else setName(column.name);
  }

  const taskList = virtualized ? (
    <VirtualTaskList
      tasks={column.tasks}
      sortable={sortable}
      scrollRef={scrollRef}
      onTaskClick={onTaskClick}
    />
  ) : (
    <div className="flex flex-col gap-5">
      {column.tasks.map((t) =>
        sortable ? (
          <SortableTask key={t.id} task={t} onSelect={onTaskClick} />
        ) : (
          <TaskCard key={t.id} task={t} onClick={() => onTaskClick(t)} />
        )
      )}
    </div>
  );

  return (
    <div className="flex h-full w-70 shrink-0 flex-col">
      <div className="mb-6 flex shrink-0 items-center gap-3">
        <span
          className="inline-block h-4 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: DOT_COLORS[index % DOT_COLORS.length] }}
        />
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setName(column.name);
                setEditing(false);
              }
            }}
            className="w-full rounded border border-purple bg-transparent px-2 py-1 text-xs font-bold uppercase tracking-[2px] text-black focus:outline-none dark:text-white"
          />
        ) : (
          <h3 className="flex-1 truncate text-xs font-bold uppercase tracking-[2.4px] text-medium-grey">
            {column.name} ({column.tasks.length})
          </h3>
        )}
        <div className={canEdit ? 'relative' : 'hidden'}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Column options"
            className="flex h-6 w-5 items-center justify-center text-medium-grey hover:text-purple"
          >
            <svg width="4" height="16" viewBox="0 0 5 20" fill="currentColor" aria-hidden>
              <circle cx="2.5" cy="2.5" r="2.5" />
              <circle cx="2.5" cy="10" r="2.5" />
              <circle cx="2.5" cy="17.5" r="2.5" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-6 z-20 w-36 rounded-lg bg-white p-1.5 shadow-xl dark:bg-very-dark">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setName(column.name);
                    setEditing(true);
                  }}
                  className="w-full rounded px-3 py-1.5 text-left text-sm font-medium text-black hover:bg-purple/10 dark:text-white"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (window.confirm(`Delete column “${column.name}” and its tasks?`)) {
                      onDelete(column.id);
                    }
                  }}
                  className="w-full rounded px-3 py-1.5 text-left text-sm font-medium text-red hover:bg-red/10"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Each column scrolls internally; required for windowed rendering */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div ref={setNodeRef} className="min-h-15">
          {sortable ? (
            <SortableContext
              items={column.tasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {taskList}
            </SortableContext>
          ) : (
            taskList
          )}
        </div>
      </div>
    </div>
  );
});
