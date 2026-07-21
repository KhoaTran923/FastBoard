import { ActivityRepository } from '../repositories/activity.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';

export const ActivityService = {
  /**
   * Records one history entry. Never throws: a failed log must not roll back
   * or fail the mutation it describes.
   */
  async log(
    projectId: string,
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await ActivityRepository.insert({
        project_id: projectId,
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
      });
    } catch (err) {
      console.error('Activity log failed:', err instanceof Error ? err.message : err);
    }
  },

  async list(projectId: string, userId: string, limit = 50, before?: Date) {
    const project = await ProjectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');
    const member = await ProjectRepository.getMember(projectId, userId);
    if (!member && project.owner_id !== userId) throw new Error('Access denied');
    return ActivityRepository.listByProject(projectId, Math.min(limit, 100), before);
  },
};
