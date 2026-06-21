import { create } from 'zustand';
import {
  createBoard as createBoardApi,
  createColumn,
  createProject,
  createTask,
  getBoards,
  getColumnTasks,
  getProjects,
  type CreateTaskInput,
} from '../services/boards';
import { apiErrorMessage } from '../services/http';
import type { Board, BoardDetail } from '../types';

const DEFAULT_WORKSPACE = 'My Workspace';

type BoardStatus = 'idle' | 'loading' | 'ready' | 'error';

interface BoardState {
  workspaceId: string | null;
  boards: Board[];
  activeBoardId: string | null;
  activeBoard: BoardDetail | null;
  status: BoardStatus;
  boardLoading: boolean;
  error: string | null;

  init: () => Promise<void>;
  selectBoard: (boardId: string) => Promise<void>;
  createBoard: (name: string, columnNames?: string[]) => Promise<void>;
  addColumn: (name: string) => Promise<void>;
  addTask: (columnId: string, input: CreateTaskInput) => Promise<void>;
  reset: () => void;
}

/** Load every column's tasks for a board and assemble the full detail view. */
async function loadBoardDetail(projectId: string, board: Board): Promise<BoardDetail> {
  const columns = board.columns ?? [];
  const columnsWithTasks = await Promise.all(
    columns
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(async (column) => ({
        ...column,
        tasks: await getColumnTasks(projectId, board.id, column.id),
      }))
  );
  return { ...board, columns: columnsWithTasks };
}

export const useBoardStore = create<BoardState>((set, get) => ({
  workspaceId: null,
  boards: [],
  activeBoardId: null,
  activeBoard: null,
  status: 'idle',
  boardLoading: false,
  error: null,

  init: async () => {
    // Guard against React StrictMode's double-invoke and concurrent calls.
    if (get().status === 'loading' || get().status === 'ready') return;
    set({ status: 'loading', error: null });
    try {
      const projects = await getProjects();
      const workspace = projects[0] ?? (await createProject(DEFAULT_WORKSPACE));
      const boards = await getBoards(workspace.id);
      set({ workspaceId: workspace.id, boards, status: 'ready' });
      if (boards.length > 0) {
        await get().selectBoard(boards[0].id);
      }
    } catch (err) {
      set({ status: 'error', error: apiErrorMessage(err) });
    }
  },

  selectBoard: async (boardId) => {
    const { workspaceId, boards } = get();
    const board = boards.find((b) => b.id === boardId);
    if (!workspaceId || !board) return;
    set({ activeBoardId: boardId, boardLoading: true });
    try {
      const detail = await loadBoardDetail(workspaceId, board);
      set({ activeBoard: detail, boardLoading: false });
    } catch (err) {
      set({ boardLoading: false, error: apiErrorMessage(err) });
    }
  },

  createBoard: async (name, columnNames = []) => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    const board = await createBoardApi(workspaceId, name);
    // Create exactly the columns the user defined (in order), skipping blanks.
    for (const columnName of columnNames) {
      const trimmed = columnName.trim();
      if (trimmed) await createColumn(workspaceId, board.id, trimmed);
    }
    const boards = await getBoards(workspaceId);
    set({ boards });
    await get().selectBoard(board.id);
  },

  addColumn: async (name) => {
    const { workspaceId, activeBoardId } = get();
    if (!workspaceId || !activeBoardId) return;
    await createColumn(workspaceId, activeBoardId, name);
    // Refresh the cached boards list so the new column shows up — selectBoard
    // rebuilds the active board from this list, not from a fresh fetch.
    const boards = await getBoards(workspaceId);
    set({ boards });
    await get().selectBoard(activeBoardId);
  },

  addTask: async (columnId, input) => {
    const { workspaceId, activeBoard, activeBoardId } = get();
    if (!workspaceId || !activeBoard || !activeBoardId) return;
    await createTask(workspaceId, activeBoard.id, columnId, input);
    await get().selectBoard(activeBoardId);
  },

  reset: () =>
    set({
      workspaceId: null,
      boards: [],
      activeBoardId: null,
      activeBoard: null,
      status: 'idle',
      boardLoading: false,
      error: null,
    }),
}));
