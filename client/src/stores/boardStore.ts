import { create } from 'zustand';
import {
  addMember as addMemberApi,
  createBoard as createBoardApi,
  createColumn,
  createProject,
  createTask,
  deleteBoard as deleteBoardApi,
  deleteColumn as deleteColumnApi,
  deleteTask as deleteTaskApi,
  getBoards,
  getColumnTasks,
  getMembers,
  getProjects,
  moveTask as moveTaskApi,
  renameBoard as renameBoardApi,
  renameColumn as renameColumnApi,
  updateTask as updateTaskApi,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '../services/boards';
import { apiErrorMessage } from '../services/http';
import type { Board, BoardDetail, Member, Task } from '../types';

const DEFAULT_WORKSPACE = 'My Workspace';

type BoardStatus = 'idle' | 'loading' | 'ready' | 'error';

interface BoardState {
  workspaceId: string | null;
  boards: Board[];
  members: Member[];
  activeBoardId: string | null;
  activeBoard: BoardDetail | null;
  status: BoardStatus;
  boardLoading: boolean;
  error: string | null;

  init: () => Promise<void>;
  selectBoard: (boardId: string) => Promise<void>;
  createBoard: (name: string, columnNames?: string[]) => Promise<void>;
  renameBoard: (boardId: string, name: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  addMember: (userId: string) => Promise<void>;
  addColumn: (name: string) => Promise<void>;
  renameColumn: (columnId: string, name: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  addTask: (columnId: string, input: CreateTaskInput) => Promise<void>;
  updateTask: (taskId: string, patch: UpdateTaskInput) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, toColumnId: string, toIndex: number) => Promise<void>;

  // Apply realtime broadcasts from other users (guarded by updated_at)
  applyRemoteTaskCreated: (task: Task) => void;
  applyRemoteTaskUpserted: (task: Task) => void;
  applyRemoteTaskDeleted: (taskId: string) => void;
  reset: () => void;
}

/**
 * Last-write-wins conflict check: skip a remote event if we already hold a
 * newer version of the task.
 */
function isStale(incoming: Task, current: Task | undefined): boolean {
  if (!current?.updated_at || !incoming.updated_at) return false;
  return new Date(incoming.updated_at).getTime() < new Date(current.updated_at).getTime();
}

/** Find a task in the active board (used by the applyRemote* actions). */
function findTask(board: BoardDetail, taskId: string): Task | undefined {
  for (const column of board.columns) {
    const task = column.tasks.find((t) => t.id === taskId);
    if (task) return task;
  }
  return undefined;
}

/** Remove `task` everywhere and re-insert it at its server-assigned position. */
function placeTask(board: BoardDetail, task: Task): BoardDetail {
  const columns = board.columns.map((column) => {
    const without = column.tasks.filter((t) => t.id !== task.id);
    if (column.id !== task.column_id) {
      return without.length === column.tasks.length ? column : { ...column, tasks: without };
    }
    const index = Math.max(0, Math.min(task.position, without.length));
    without.splice(index, 0, task);
    return { ...column, tasks: without };
  });
  return { ...board, columns };
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
  members: [],
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
      const [boards, members] = await Promise.all([
        getBoards(workspace.id),
        getMembers(workspace.id),
      ]);
      set({ workspaceId: workspace.id, boards, members, status: 'ready' });
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
    for (const columnName of columnNames) {
      const trimmed = columnName.trim();
      if (trimmed) await createColumn(workspaceId, board.id, trimmed);
    }
    const boards = await getBoards(workspaceId);
    set({ boards });
    await get().selectBoard(board.id);
  },

  renameBoard: async (boardId, name) => {
    const { workspaceId, boards, activeBoard } = get();
    if (!workspaceId) return;
    const snapshot = { boards, activeBoard };
    set({
      boards: boards.map((b) => (b.id === boardId ? { ...b, name } : b)),
      activeBoard:
        activeBoard && activeBoard.id === boardId ? { ...activeBoard, name } : activeBoard,
    });
    try {
      await renameBoardApi(workspaceId, boardId, name);
    } catch (err) {
      set({ ...snapshot, error: apiErrorMessage(err) });
    }
  },

  deleteBoard: async (boardId) => {
    const { workspaceId, boards, activeBoardId, activeBoard } = get();
    if (!workspaceId) return;
    const snapshot = { boards, activeBoardId, activeBoard };
    const remaining = boards.filter((b) => b.id !== boardId);
    set({ boards: remaining });
    if (activeBoardId === boardId) {
      if (remaining.length > 0) {
        await get().selectBoard(remaining[0].id);
      } else {
        set({ activeBoardId: null, activeBoard: null });
      }
    }
    try {
      await deleteBoardApi(workspaceId, boardId);
    } catch (err) {
      set({ ...snapshot, error: apiErrorMessage(err) });
    }
  },

  addMember: async (userId) => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    await addMemberApi(workspaceId, userId);
    const members = await getMembers(workspaceId);
    set({ members });
  },

  addColumn: async (name) => {
    const { workspaceId, activeBoardId } = get();
    if (!workspaceId || !activeBoardId) return;
    await createColumn(workspaceId, activeBoardId, name);
    const boards = await getBoards(workspaceId);
    set({ boards });
    await get().selectBoard(activeBoardId);
  },

  renameColumn: async (columnId, name) => {
    const { workspaceId, activeBoardId, activeBoard, boards } = get();
    if (!workspaceId || !activeBoardId || !activeBoard) return;
    const snapshot = { activeBoard, boards };
    // Optimistic: update the name in both the active board and the cached list.
    set({
      activeBoard: {
        ...activeBoard,
        columns: activeBoard.columns.map((c) => (c.id === columnId ? { ...c, name } : c)),
      },
      boards: boards.map((b) =>
        b.id === activeBoardId
          ? {
              ...b,
              columns: (b.columns ?? []).map((c) => (c.id === columnId ? { ...c, name } : c)),
            }
          : b
      ),
    });
    try {
      await renameColumnApi(workspaceId, activeBoardId, columnId, name);
    } catch (err) {
      set({ ...snapshot, error: apiErrorMessage(err) });
    }
  },

  deleteColumn: async (columnId) => {
    const { workspaceId, activeBoardId, activeBoard, boards } = get();
    if (!workspaceId || !activeBoardId || !activeBoard) return;
    const snapshot = { activeBoard, boards };
    set({
      activeBoard: {
        ...activeBoard,
        columns: activeBoard.columns.filter((c) => c.id !== columnId),
      },
      boards: boards.map((b) =>
        b.id === activeBoardId
          ? { ...b, columns: (b.columns ?? []).filter((c) => c.id !== columnId) }
          : b
      ),
    });
    try {
      await deleteColumnApi(workspaceId, activeBoardId, columnId);
    } catch (err) {
      set({ ...snapshot, error: apiErrorMessage(err) });
    }
  },

  addTask: async (columnId, input) => {
    const { workspaceId, activeBoard } = get();
    if (!workspaceId || !activeBoard) return;
    const task = await createTask(workspaceId, activeBoard.id, columnId, input);
    set((state) =>
      state.activeBoard
        ? {
            activeBoard: {
              ...state.activeBoard,
              columns: state.activeBoard.columns.map((c) =>
                c.id === columnId ? { ...c, tasks: [...c.tasks, task] } : c
              ),
            },
          }
        : {}
    );
  },

  updateTask: async (taskId, patch) => {
    const { workspaceId, activeBoard } = get();
    if (!workspaceId || !activeBoard) return;
    const column = activeBoard.columns.find((c) => c.tasks.some((t) => t.id === taskId));
    if (!column) return;
    const updated = await updateTaskApi(workspaceId, activeBoard.id, column.id, taskId, patch);
    set((state) => {
      if (!state.activeBoard) return {};
      // Remove the task everywhere, then re-insert it into its (possibly new) column.
      const cleared = state.activeBoard.columns.map((c) => ({
        ...c,
        tasks: c.tasks.filter((t) => t.id !== taskId),
      }));
      const columns = cleared.map((c) =>
        c.id === updated.column_id ? { ...c, tasks: [...c.tasks, updated] } : c
      );
      return { activeBoard: { ...state.activeBoard, columns } };
    });
  },

  deleteTask: async (taskId) => {
    const { workspaceId, activeBoard } = get();
    if (!workspaceId || !activeBoard) return;
    const column = activeBoard.columns.find((c) => c.tasks.some((t) => t.id === taskId));
    if (!column) return;
    const snapshot = activeBoard;
    set({
      activeBoard: {
        ...activeBoard,
        columns: activeBoard.columns.map((c) => ({
          ...c,
          tasks: c.tasks.filter((t) => t.id !== taskId),
        })),
      },
    });
    try {
      await deleteTaskApi(workspaceId, activeBoard.id, column.id, taskId);
    } catch (err) {
      set({ activeBoard: snapshot, error: apiErrorMessage(err) });
    }
  },

  moveTask: async (taskId, toColumnId, toIndex) => {
    const { workspaceId, activeBoard } = get();
    if (!workspaceId || !activeBoard) return;

    let moved: Task | undefined;
    let fromColumnId: string | undefined;
    for (const col of activeBoard.columns) {
      const found = col.tasks.find((t) => t.id === taskId);
      if (found) {
        moved = found;
        fromColumnId = col.id;
        break;
      }
    }
    if (!moved || !fromColumnId) return;

    const snapshot = activeBoard;
    // Optimistically rebuild the columns with the task in its new place.
    const columns = activeBoard.columns.map((col) => {
      if (col.id === fromColumnId && col.id === toColumnId) {
        const without = col.tasks.filter((t) => t.id !== taskId);
        without.splice(toIndex, 0, moved!);
        return { ...col, tasks: without };
      }
      if (col.id === fromColumnId) {
        return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
      }
      if (col.id === toColumnId) {
        const next = col.tasks.slice();
        next.splice(toIndex, 0, { ...moved!, column_id: toColumnId });
        return { ...col, tasks: next };
      }
      return col;
    });
    set({ activeBoard: { ...activeBoard, columns } });

    try {
      const confirmed = await moveTaskApi(
        workspaceId,
        activeBoard.id,
        fromColumnId,
        taskId,
        toColumnId,
        toIndex
      );
      // Merge the server-confirmed fields (mainly updated_at) without touching
      // the optimistic placement, in case the user dragged the card again.
      set((state) => {
        if (!state.activeBoard) return {};
        const columns = state.activeBoard.columns.map((c) => ({
          ...c,
          tasks: c.tasks.map((t) =>
            t.id === taskId ? { ...confirmed, column_id: t.column_id, position: t.position } : t
          ),
        }));
        return { activeBoard: { ...state.activeBoard, columns } };
      });
    } catch (err) {
      set({ activeBoard: snapshot, error: apiErrorMessage(err) });
    }
  },

  // Realtime: changes made by other users, broadcast by the server

  applyRemoteTaskCreated: (task) => {
    set((state) => {
      const board = state.activeBoard;
      if (!board || findTask(board, task.id)) return {}; // duplicate event
      return { activeBoard: placeTask(board, task) };
    });
  },

  applyRemoteTaskUpserted: (task) => {
    set((state) => {
      const board = state.activeBoard;
      if (!board) return {};
      if (isStale(task, findTask(board, task.id))) return {}; // lost the conflict
      return { activeBoard: placeTask(board, task) };
    });
  },

  applyRemoteTaskDeleted: (taskId) => {
    set((state) => {
      const board = state.activeBoard;
      if (!board || !findTask(board, taskId)) return {};
      return {
        activeBoard: {
          ...board,
          columns: board.columns.map((c) => ({
            ...c,
            tasks: c.tasks.filter((t) => t.id !== taskId),
          })),
        },
      };
    });
  },

  reset: () =>
    set({
      workspaceId: null,
      boards: [],
      members: [],
      activeBoardId: null,
      activeBoard: null,
      status: 'idle',
      boardLoading: false,
      error: null,
    }),
}));
