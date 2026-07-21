import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTask } from './SortableTask';
import { TaskCard } from './TaskCard';
import type { ColumnWithTasks, Task } from '../../types';

const DOT_COLORS = ['#49C4E5', '#8471F2', '#67E2AE', '#E5A449', '#E5497E', '#49E5C4'];

interface BoardColumnProps {
  column: ColumnWithTasks;
  index: number;
  /** When true, tasks are draggable/sortable; when false (search), read-only. */
  sortable: boolean;
  /** When false (viewer role), the rename/delete menu is hidden. */
  canEdit: boolean;
  onTaskClick: (task: Task) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

export function BoardColumn({
  column,
  index,
  sortable,
  canEdit,
  onTaskClick,
  onRename,
  onDelete,
}: BoardColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);

  function commitRename() {
    const trimmed = name.trim();
    setEditing(false);
    if (trimmed && trimmed !== column.name) onRename(trimmed);
    else setName(column.name);
  }

  return (
    <div className="w-70 shrink-0">
      <div className="mb-6 flex items-center gap-3">
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
                    if (window.confirm(`Delete column “${column.name}” and its tasks?`)) onDelete();
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

      <div ref={setNodeRef} className="flex min-h-15 flex-col gap-5">
        {sortable ? (
          <SortableContext
            items={column.tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {column.tasks.map((t) => (
              <SortableTask key={t.id} task={t} onClick={() => onTaskClick(t)} />
            ))}
          </SortableContext>
        ) : (
          column.tasks.map((t) => <TaskCard key={t.id} task={t} onClick={() => onTaskClick(t)} />)
        )}
      </div>
    </div>
  );
}
