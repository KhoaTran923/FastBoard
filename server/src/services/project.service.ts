import { ProjectRepository } from '../repositories/project.repository.js';
import type { CreateProjectInput, UpdateProjectInput } from '../schemas/project.schema.js';
import type { UserRole } from '../types/index.js';

export const ProjectService = {
  async getAll(userId: string) {
    return ProjectRepository.findAllByUser(userId);
  },

  async getById(id: string, userId: string) {
    const project = await ProjectRepository.findById(id);
    if (!project) throw new Error('Project not found');

    // Check access: owner or member
    const isOwner = project.owner_id === userId;
    const member = isOwner ? null : await ProjectRepository.getMember(id, userId);
    if (!isOwner && !member) throw new Error('Access denied');

    return project;
  },

  async create(data: CreateProjectInput, ownerId: string) {
    const project = await ProjectRepository.create({ ...data, owner_id: ownerId });
    // Auto-add owner as admin
    await ProjectRepository.addMember(project.id, ownerId, 'admin');
    return project;
  },

  async update(id: string, data: UpdateProjectInput, userId: string) {
    const member = await ProjectRepository.getMember(id, userId);
    if (!member || member.role !== 'admin') throw new Error('Forbidden');
    return ProjectRepository.update(id, data);
  },

  async delete(id: string, userId: string) {
    const project = await ProjectRepository.findById(id);
    if (!project) throw new Error('Project not found');
    if (project.owner_id !== userId) throw new Error('Only owner can delete project');
    await ProjectRepository.delete(id);
  },

  async addMember(projectId: string, targetUserId: string, role: UserRole, requesterId: string) {
    const requester = await ProjectRepository.getMember(projectId, requesterId);
    if (!requester || requester.role !== 'admin') throw new Error('Forbidden');
    return ProjectRepository.addMember(projectId, targetUserId, role);
  },

  async removeMember(projectId: string, targetUserId: string, requesterId: string) {
    const requester = await ProjectRepository.getMember(projectId, requesterId);
    if (!requester || requester.role !== 'admin') throw new Error('Forbidden');
    return ProjectRepository.removeMember(projectId, targetUserId);
  },

  async getMembers(projectId: string, userId: string) {
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');
    const member = await ProjectRepository.getMember(projectId, userId);
    if (!member && project.owner_id !== userId) throw new Error('Access denied');
    return ProjectRepository.getMembers(projectId);
  },
};
