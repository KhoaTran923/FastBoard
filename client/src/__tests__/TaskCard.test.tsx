import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskCard } from '../components/Board/TaskCard';
import { useBoardStore } from '../stores/boardStore';
import type { Member, Task } from '../types';

const member: Member = {
  id: 'user-1',
  email: 'alice@fastboard.dev',
  full_name: 'Alice Nguyen',
  role: 'admin',
  joined_at: new Date().toISOString(),
};

const baseTask: Task = {
  id: 'task-1',
  column_id: 'col-1',
  title: 'Ship the release',
  description: 'Cut the tag and publish',
  priority: 'high',
  due_date: '2026-08-15',
  assignees: ['user-1'],
  position: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

beforeEach(() => {
  useBoardStore.setState({ members: [member] });
});

describe('TaskCard', () => {
  it('renders title, description, priority, and due date', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.getByText('Ship the release')).toBeInTheDocument();
    expect(screen.getByText('Cut the tag and publish')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Aug 15')).toBeInTheDocument();
  });

  it('shows the assignee avatar resolved from the member list', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.getByTitle('alice@fastboard.dev')).toBeInTheDocument();
  });

  it('marks completed tasks with a check icon and strikethrough', () => {
    render(<TaskCard task={{ ...baseTask, completed_at: new Date().toISOString() }} />);
    expect(screen.getByLabelText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Ship the release')).toHaveClass('line-through');
  });

  it('renders plain text for HTML-looking titles (React escapes by default)', () => {
    const xss = '<img src=x onerror=alert(1)>';
    render(<TaskCard task={{ ...baseTask, title: xss, description: null }} />);
    // The payload is visible as text and no <img> element was created
    expect(screen.getByText(xss)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
});
