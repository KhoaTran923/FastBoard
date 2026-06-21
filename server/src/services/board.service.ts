import { BoardRepository } from '../repositories/board.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';

export const BoardService = {
  async getBoardsWithColumns(projectId: string, userId: string) {
    const member = await ProjectRepository.getMember(projectId, userId);
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');
    if (!member && project.owner_id !== userId) throw new Error('Access denied');

    const boards = await BoardRepository.findByProject(projectId);
    const result = await Promise.all(
      boards.map(async (board) => ({
        ...board,
        columns: await BoardRepository.getColumns(board.id),
      }))
    );
    return result;
  },

  async createBoard(projectId: string, name: string, userId: string) {
    const member = await ProjectRepository.getMember(projectId, userId);
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');
    if (!member && project.owner_id !== userId) throw new Error('Access denied');
    if (member?.role === 'viewer') throw new Error('Viewers cannot create boards');
    return BoardRepository.create({ project_id: projectId, name });
  },

  async deleteBoard(boardId: string, userId: string) {
    const board = await BoardRepository.findById(boardId);
    if (!board) throw new Error('Board not found');
    const member = await ProjectRepository.getMember(board.project_id, userId);
    if (!member || member.role !== 'admin') throw new Error('Forbidden');
    await BoardRepository.delete(boardId);
  },

  async createColumn(boardId: string, name: string, userId: string) {
    const board = await BoardRepository.findById(boardId);
    if (!board) throw new Error('Board not found');
    const member = await ProjectRepository.getMember(board.project_id, userId);
    const project = await ProjectRepository.findById(board.project_id);
    if (!project) throw new Error('Project not found');
    if (!member && project.owner_id !== userId) throw new Error('Access denied');
    if (member?.role === 'viewer') throw new Error('Viewers cannot add columns');
    return BoardRepository.createColumn({ board_id: boardId, name });
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
    return BoardRepository.updateColumn(columnId, name);
  },

  async deleteColumn(columnId: string, userId: string) {
    const col = await BoardRepository.findColumnById(columnId);
    if (!col) throw new Error('Column not found');
    const board = await BoardRepository.findById(col.board_id);
    if (!board) throw new Error('Board not found');
    const member = await ProjectRepository.getMember(board.project_id, userId);
    if (!member || member.role !== 'admin') throw new Error('Forbidden');
    await BoardRepository.deleteColumn(columnId);
  },
};
