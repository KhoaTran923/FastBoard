import { BoardRepository } from '../repositories/board.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { ActivityService } from './activity.service.js';
import { cache, cacheKeys } from '../lib/cache.js';
import type { Board, Column } from '../types/index.js';

type BoardWithColumns = Board & { columns: Column[] };

export const BoardService = {
  async getBoardsWithColumns(projectId: string, userId: string) {
    // Authorization always runs; only the data itself is cached
    const member = await ProjectRepository.getMember(projectId, userId);
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');
    if (!member && project.owner_id !== userId) throw new Error('Access denied');

    const key = cacheKeys.boards(projectId);
    const cached = await cache.get<BoardWithColumns[]>(key);
    if (cached) return cached;

    const boards = await BoardRepository.findByProject(projectId);
    const result = await Promise.all(
      boards.map(async (board) => ({
        ...board,
        columns: await BoardRepository.getColumns(board.id),
      }))
    );
    await cache.set(key, result);
    return result;
  },

  async createBoard(projectId: string, name: string, userId: string) {
    const member = await ProjectRepository.getMember(projectId, userId);
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');
    if (!member && project.owner_id !== userId) throw new Error('Access denied');
    if (member?.role === 'viewer') throw new Error('Viewers cannot create boards');
    const board = await BoardRepository.create({ project_id: projectId, name });
    await cache.del(cacheKeys.boards(projectId));
    await ActivityService.log(projectId, userId, 'board.created', 'board', board.id, { name });
    return board;
  },

  async renameBoard(boardId: string, name: string, userId: string) {
    const board = await BoardRepository.findById(boardId);
    if (!board) throw new Error('Board not found');
    const member = await ProjectRepository.getMember(board.project_id, userId);
    if (!member || member.role !== 'admin') throw new Error('Forbidden');
    const updated = await BoardRepository.update(boardId, name);
    await cache.del(cacheKeys.boards(board.project_id));
    await ActivityService.log(board.project_id, userId, 'board.renamed', 'board', boardId, {
      from: board.name,
      to: name,
    });
    return updated;
  },

  async deleteBoard(boardId: string, userId: string) {
    const board = await BoardRepository.findById(boardId);
    if (!board) throw new Error('Board not found');
    const member = await ProjectRepository.getMember(board.project_id, userId);
    if (!member || member.role !== 'admin') throw new Error('Forbidden');
    await BoardRepository.delete(boardId);
    await cache.del(cacheKeys.boards(board.project_id));
    await ActivityService.log(board.project_id, userId, 'board.deleted', 'board', boardId, {
      name: board.name,
    });
  },

  async createColumn(boardId: string, name: string, userId: string) {
    const board = await BoardRepository.findById(boardId);
    if (!board) throw new Error('Board not found');
    const member = await ProjectRepository.getMember(board.project_id, userId);
    const project = await ProjectRepository.findById(board.project_id);
    if (!project) throw new Error('Project not found');
    if (!member && project.owner_id !== userId) throw new Error('Access denied');
    if (member?.role === 'viewer') throw new Error('Viewers cannot add columns');
    const column = await BoardRepository.createColumn({ board_id: boardId, name });
    await cache.del(cacheKeys.boards(board.project_id));
    await ActivityService.log(board.project_id, userId, 'column.created', 'column', column.id, {
      name,
    });
    return column;
  },

  async renameColumn(columnId: string, name: string, userId: string) {
    const col = await BoardRepository.findColumnById(columnId);
    if (!col) throw new Error('Column not found');
    const board = await BoardRepository.findById(col.board_id);
    if (!board) throw new Error('Board not found');
    const member = await ProjectRepository.getMember(board.project_id, userId);
    const project = await ProjectRepository.findById(board.project_id);
    if (!project) throw new Error('Project not found');
    if (!member && project.owner_id !== userId) throw new Error('Access denied');
    if (member?.role === 'viewer') throw new Error('Viewers cannot rename columns');
    const updated = await BoardRepository.updateColumn(columnId, name);
    await cache.del(cacheKeys.boards(board.project_id));
    await ActivityService.log(board.project_id, userId, 'column.renamed', 'column', columnId, {
      from: col.name,
      to: name,
    });
    return updated;
  },

  async deleteColumn(columnId: string, userId: string) {
    const col = await BoardRepository.findColumnById(columnId);
    if (!col) throw new Error('Column not found');
    const board = await BoardRepository.findById(col.board_id);
    if (!board) throw new Error('Board not found');
    const member = await ProjectRepository.getMember(board.project_id, userId);
    if (!member || member.role !== 'admin') throw new Error('Forbidden');
    await BoardRepository.deleteColumn(columnId);
    await cache.del(cacheKeys.boards(board.project_id));
    await ActivityService.log(board.project_id, userId, 'column.deleted', 'column', columnId, {
      name: col.name,
    });
  },
};
