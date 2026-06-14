import { BoardRepository } from '../repositories/board.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { pool } from '../db/pool.js';

async function requireProjectAccess(projectId: string, userId: string, minRole?: 'admin' | 'member') {
  const role = await ProjectRepository.getMemberRole(projectId, userId);
  if (!role) throw Object.assign(new Error('Không có quyền truy cập'), { code: 'FORBIDDEN', status: 403 });
  if (minRole === 'admin' && role !== 'admin') {
    throw Object.assign(new Error('Cần quyền admin'), { code: 'FORBIDDEN', status: 403 });
  }
  return role;
}

export const BoardService = {
  async getBoards(projectId: string, userId: string) {
    await requireProjectAccess(projectId, userId);
    return BoardRepository.findByProject(projectId);
  },

  async getBoardWithColumns(boardId: string, userId: string) {
    const board = await BoardRepository.findById(boardId);
    if (!board) throw Object.assign(new Error('Board không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    await requireProjectAccess(board.project_id, userId);
    const columns = await BoardRepository.getColumns(boardId);
    return { ...board, columns };
  },

  async createBoard(projectId: string, userId: string, data: { name: string; position?: number }) {
    await requireProjectAccess(projectId, userId, 'member');
    return BoardRepository.create({ ...data, project_id: projectId });
  },

  async updateBoard(boardId: string, userId: string, data: { name?: string; position?: number }) {
    const board = await BoardRepository.findById(boardId);
    if (!board) throw Object.assign(new Error('Board không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    await requireProjectAccess(board.project_id, userId, 'member');
    return BoardRepository.update(boardId, data);
  },

  async deleteBoard(boardId: string, userId: string): Promise<void> {
    const board = await BoardRepository.findById(boardId);
    if (!board) throw Object.assign(new Error('Board không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    await requireProjectAccess(board.project_id, userId, 'admin');
    await BoardRepository.delete(boardId);
  },

  async createColumn(boardId: string, userId: string, data: { name: string; position?: number }) {
    const board = await BoardRepository.findById(boardId);
    if (!board) throw Object.assign(new Error('Board không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    await requireProjectAccess(board.project_id, userId, 'member');
    return BoardRepository.createColumn({ ...data, board_id: boardId });
  },

  async updateColumn(columnId: string, userId: string, data: { name?: string; position?: number }) {
    const { rows } = await pool.query(
      'SELECT b.project_id FROM columns c JOIN boards b ON b.id = c.board_id WHERE c.id = $1',
      [columnId],
    );
    if (!rows[0]) throw Object.assign(new Error('Column không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    await requireProjectAccess(rows[0].project_id, userId, 'member');
    return BoardRepository.updateColumn(columnId, data);
  },

  async deleteColumn(columnId: string, userId: string): Promise<void> {
    const { rows } = await pool.query(
      'SELECT b.project_id FROM columns c JOIN boards b ON b.id = c.board_id WHERE c.id = $1',
      [columnId],
    );
    if (!rows[0]) throw Object.assign(new Error('Column không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    await requireProjectAccess(rows[0].project_id, userId, 'admin');
    await BoardRepository.deleteColumn(columnId);
  },
};
