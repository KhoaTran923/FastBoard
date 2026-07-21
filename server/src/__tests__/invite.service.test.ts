import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InviteService } from '../services/invite.service.js';
import { InviteRepository } from '../repositories/invite.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { NotificationRepository } from '../repositories/notification.repository.js';
import { ActivityRepository } from '../repositories/activity.repository.js';

vi.mock('../repositories/invite.repository.js');
vi.mock('../repositories/project.repository.js');
vi.mock('../repositories/notification.repository.js');
vi.mock('../repositories/activity.repository.js');

const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

const mockInvite = {
  token: 'invite-token-1',
  project_id: 'proj-1',
  role: 'member' as const,
  created_by: 'admin-1',
  expires_at: future,
  created_at: new Date(),
  project_name: 'FastBoard',
  inviter_name: 'Admin',
};

const adminMember = {
  project_id: 'proj-1',
  user_id: 'admin-1',
  role: 'admin' as const,
  joined_at: new Date(),
};

const viewerMember = {
  project_id: 'proj-1',
  user_id: 'viewer-1',
  role: 'viewer' as const,
  joined_at: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe('InviteService.create', () => {
  it('should let an admin mint an invite with the requested role', async () => {
    vi.mocked(ProjectRepository.getMember).mockResolvedValue(adminMember);
    vi.mocked(InviteRepository.create).mockResolvedValue(mockInvite);

    const invite = await InviteService.create('proj-1', 'viewer', 'admin-1');

    expect(invite.token).toBe('invite-token-1');
    expect(InviteRepository.create).toHaveBeenCalledWith(
      'proj-1',
      'viewer',
      'admin-1',
      expect.any(Date)
    );
  });

  it('should reject non-admin requesters', async () => {
    vi.mocked(ProjectRepository.getMember).mockResolvedValue(viewerMember);

    await expect(InviteService.create('proj-1', 'member', 'viewer-1')).rejects.toThrow('Forbidden');
  });
});

describe('InviteService.accept', () => {
  it('should add the user as a member with the invite role', async () => {
    vi.mocked(InviteRepository.findByToken).mockResolvedValue(mockInvite);
    vi.mocked(ProjectRepository.getMember).mockResolvedValue(null);
    vi.mocked(ProjectRepository.addMember).mockResolvedValue({
      project_id: 'proj-1',
      user_id: 'new-user',
      role: 'member',
      joined_at: new Date(),
    });

    const result = await InviteService.accept('invite-token-1', 'new-user');

    expect(result).toEqual({ project_id: 'proj-1', already_member: false });
    expect(ProjectRepository.addMember).toHaveBeenCalledWith('proj-1', 'new-user', 'member');
    // Joining is recorded and the inviter is notified
    expect(ActivityRepository.insert).toHaveBeenCalled();
    expect(NotificationRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'admin-1', type: 'invite_accepted' })
    );
  });

  it('should reject an expired invite', async () => {
    vi.mocked(InviteRepository.findByToken).mockResolvedValue({
      ...mockInvite,
      expires_at: past,
    });

    await expect(InviteService.accept('invite-token-1', 'new-user')).rejects.toThrow(
      'Invite has expired'
    );
    expect(ProjectRepository.addMember).not.toHaveBeenCalled();
  });

  it('should be a no-op for existing members', async () => {
    vi.mocked(InviteRepository.findByToken).mockResolvedValue(mockInvite);
    vi.mocked(ProjectRepository.getMember).mockResolvedValue(viewerMember);

    const result = await InviteService.accept('invite-token-1', 'viewer-1');

    expect(result).toEqual({ project_id: 'proj-1', already_member: true });
    expect(ProjectRepository.addMember).not.toHaveBeenCalled();
  });
});
