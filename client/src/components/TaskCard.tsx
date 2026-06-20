import type { Task } from '../types';

const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-[#67E2AE]',
  medium: 'bg-[#E5A449]',
  high: 'bg-[#E5497E]',
  urgent: 'bg-red',
};

export function TaskCard({ task }: { task: Task }) {
  return (
    <div className="group cursor-pointer rounded-lg bg-white px-4 py-5 shadow-[0_4px_6px_rgba(54,78,126,0.1)] dark:bg-dark-grey">
      <h4 className="font-bold text-black group-hover:text-purple dark:text-white">{task.title}</h4>
      {task.priority && (
        <p className="mt-2 flex items-center gap-2 text-xs font-bold text-medium-grey">
          <span className={`inline-block h-2 w-2 rounded-full ${PRIORITY_COLOR[task.priority]}`} />
          {task.priority[0].toUpperCase() + task.priority.slice(1)} priority
        </p>
      )}
    </div>
  );
}
