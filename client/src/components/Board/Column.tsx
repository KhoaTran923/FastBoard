import { TaskCard } from './TaskCard';
import type { ColumnWithTasks } from '../../types';

const DOT_COLORS = ['#49C4E5', '#8471F2', '#67E2AE', '#E5A449', '#E5497E', '#49E5C4'];

export function Column({ column, index }: { column: ColumnWithTasks; index: number }) {
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
