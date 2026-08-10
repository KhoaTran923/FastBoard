import { InviteRepository } from '../repositories/invite.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { ActivityService } from './activity.service.js';
import { NotificationService } from './notification.service.js';
import { cache, cacheKeys } from '../lib/cache.js';
import type { UserRole } from '../types/index.js';

const DEFAULT_EXPIRY_DAYS = 7;

export const InviteService = {
  /** Admin-only: mints a shareable link token that grants `role` on accept. */
  async create(projectId: string, role: UserRole, requesterId: string, expiresInDays?: number) {
    const requester = await ProjectRepository.getMember(projectId, requesterId);
    if (!requester || requester.role !== 'admin') throw new Error('Forbidden');

    const days = expiresInDays ?? DEFAULT_EXPIRY_DAYS;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return InviteRepository.create(projectId, role, requesterId, expiresAt);
  },

  /** Preview shown on the invite page before the user accepts. */
  async preview(token: string, userId: string) {
    const invite = await InviteRepository.findByToken(token);
    if (!invite) throw new Error('Invite not found');

    const member = await ProjectRepository.getMember(invite.project_id, userId);
    return {
      project_id: invite.project_id,
      project_name: invite.project_name,
      role: invite.role,
      inviter_name: invite.inviter_name,
      expired: invite.expires_at.getTime() < Date.now(),
      already_member: member !== null,
    };
  },

  /** Joins the requesting user to the invite's project with the invite role. */
  async accept(token: string, userId: string) {
    const invite = await InviteRepository.findByToken(token);
    if (!invite) throw new Error('Invite not found');
    if (invite.expires_at.getTime() < Date.now()) throw new Error('Invite has expired');

    const existing = await ProjectRepository.getMember(invite.project_id, userId);
    if (existing) return { project_id: invite.project_id, already_member: true };

    await ProjectRepository.addMember(invite.project_id, userId, invite.role);
    await cache.del(cacheKeys.members(invite.project_id));

    await ActivityService.log(
      invite.project_id,
      userId,
      'member.joined',
      'project',
      invite.project_id,
      {
        via: 'invite_link',
        role: invite.role,
      }
    );
    if (invite.created_by) {
      await NotificationService.push(
        [invite.created_by],
        userId,
        invite.project_id,
        'invite_accepted',
        { role: invite.role }
      );
    }

    return { project_id: invite.project_id, already_member: false };
  },

  async listForProject(projectId: string, requesterId: string) {
    const requester = await ProjectRepository.getMember(projectId, requesterId);
    if (!requester || requester.role !== 'admin') throw new Error('Forbidden');
    return InviteRepository.findByProject(projectId);
  },

  async revoke(token: string, requesterId: string) {
    const invite = await InviteRepository.findByToken(token);
    if (!invite) throw new Error('Invite not found');
    const requester = await ProjectRepository.getMember(invite.project_id, requesterId);
    if (!requester || requester.role !== 'admin') throw new Error('Forbidden');
    await InviteRepository.delete(token);
  },
};
