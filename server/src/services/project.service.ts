import { ProjectRepository } from '../repositories/project.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { Project, ProjectMember } from '../types/index.js';

export const ProjectService = {
  async getAll(userId: string) {
    return ProjectRepository.findAllByUser(userId);
  },

  async getById(id: string, userId: string): Promise<Project> {
    const project = await ProjectRepository.findById(id);
    if (!project) {
      throw Object.assign(new Error('Project không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    }
    const role = await ProjectRepository.getMemberRole(id, userId);
    if (!role) {
      throw Object.assign(new Error('Bạn không có quyền truy cập project này'), {
        code: 'FORBIDDEN', status: 403,
      });
    }
    return project;
  },

  async create(data: { name: string; description?: string; owner_id: string }) {
    return ProjectRepository.create(data);
  },

  async update(id: string, userId: string, data: { name?: string; description?: string }) {
    const role = await ProjectRepository.getMemberRole(id, userId);
    if (role !== 'admin') {
      throw Object.assign(new Error('Chỉ admin mới có thể chỉnh sửa project'), {
        code: 'FORBIDDEN', status: 403,
      });
    }
    const updated = await ProjectRepository.update(id, data);
    if (!updated) throw Object.assign(new Error('Project không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    return updated;
  },

  async delete(id: string, userId: string): Promise<void> {
    const project = await ProjectRepository.findById(id);
    if (!project) throw Object.assign(new Error('Project không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    if (project.owner_id !== userId) {
      throw Object.assign(new Error('Chỉ owner mới có thể xóa project'), { code: 'FORBIDDEN', status: 403 });
    }
    await ProjectRepository.delete(id);
  },

  async addMember(projectId: string, requesterId: string, email: string, role: ProjectMember['role']) {
    const requesterRole = await ProjectRepository.getMemberRole(projectId, requesterId);
    if (requesterRole !== 'admin') {
      throw Object.assign(new Error('Chỉ admin mới có thể thêm thành viên'), { code: 'FORBIDDEN', status: 403 });
    }
    const user = await UserRepository.findByEmail(email);
    if (!user) throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    await ProjectRepository.addMember(projectId, user.id, role);
  },

  async removeMember(projectId: string, requesterId: string, memberId: string): Promise<void> {
    const requesterRole = await ProjectRepository.getMemberRole(projectId, requesterId);
    if (requesterRole !== 'admin') {
      throw Object.assign(new Error('Chỉ admin mới có thể xóa thành viên'), { code: 'FORBIDDEN', status: 403 });
    }
    await ProjectRepository.removeMember(projectId, memberId);
  },

  async getMembers(projectId: string, userId: string) {
    const role = await ProjectRepository.getMemberRole(projectId, userId);
    if (!role) throw Object.assign(new Error('Không có quyền truy cập'), { code: 'FORBIDDEN', status: 403 });
    return ProjectRepository.getMembers(projectId);
  },
};
