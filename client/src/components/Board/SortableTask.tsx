import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard';
import type { Task } from '../../types';

interface SortableTaskProps {
  task: Task;
  /** Stable callback from the board; memo stays effective. */
  onSelect: (task: Task) => void;
}

export const SortableTask = memo(function SortableTask({ task, onSelect }: SortableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={() => onSelect(task)} />
    </div>
  );
});
