import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskDetailModal } from '../components/modals/TaskDetailModal';
import { useBoardStore } from '../stores/boardStore';
import type { BoardDetail, Task } from '../types';

const task: Task = {
  id: 'task-1',
  column_id: 'col-1',
  title: 'Write the report',
  description: null,
  priority: 'medium',
  due_date: null,
  assignees: [],
  position: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const board: BoardDetail = {
  id: 'board-1',
  project_id: 'proj-1',
  name: 'Sprint',
  position: 0,
  columns: [
    { id: 'col-1', board_id: 'board-1', name: 'Todo', position: 0, tasks: [task] },
    { id: 'col-2', board_id: 'board-1', name: 'Done', position: 1, tasks: [] },
  ],
};

beforeEach(() => {
  useBoardStore.setState({ activeBoard: board, members: [] });
});

describe('TaskDetailModal', () => {
  it('renders the editable form for members', () => {
    render(<TaskDetailModal task={task} onClose={() => {}} />);
    expect(screen.getByDisplayValue('Write the report')).toBeEnabled();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('disables every input and hides actions for viewers (readOnly)', () => {
    render(<TaskDetailModal task={task} readOnly onClose={() => {}} />);
    expect(screen.getByDisplayValue('Write the report')).toBeDisabled();
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });
});
