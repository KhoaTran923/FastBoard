import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectService } from '../services/project.service.js';
import { ProjectRepository } from '../repositories/project.repository.js';

vi.mock('../repositories/project.repository.js');

const mockProject = {
  id: 'proj-uuid-1',
  name: 'FastBoard',
  description: 'Internship project',
  owner_id: 'user-uuid-1',
  created_at: new Date(),
};

const mockMemberAdmin = {
  project_id: 'proj-uuid-1',
  user_id: 'user-uuid-1',
  role: 'admin' as const,
  joined_at: new Date(),
};

const mockMemberViewer = {
  project_id: 'proj-uuid-1',
  user_id: 'user-uuid-2',
  role: 'viewer' as const,
  joined_at: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe('ProjectService.create', () => {
  it('should create project and add owner as admin', async () => {
    vi.mocked(ProjectRepository.create).mockResolvedValue(mockProject);
    vi.mocked(ProjectRepository.addMember).mockResolvedValue(mockMemberAdmin);

    const result = await ProjectService.create(
      { name: 'FastBoard', description: 'Internship project' },
      'user-uuid-1'
    );

    expect(result.name).toBe('FastBoard');
    expect(ProjectRepository.addMember).toHaveBeenCalledWith(
      'proj-uuid-1', 'user-uuid-1', 'admin'
    );
  });
});

describe('ProjectService.delete', () => {
  it('should allow owner to delete project', async () => {
    vi.mocked(ProjectRepository.findById).mockResolvedValue(mockProject);
    vi.mocked(ProjectRepository.delete).mockResolvedValue(undefined);

    await expect(
      ProjectService.delete('proj-uuid-1', 'user-uuid-1')
    ).resolves.not.toThrow();
  });

  it('should throw if not owner', async () => {
    vi.mocked(ProjectRepository.findById).mockResolvedValue(mockProject);

    await expect(
      ProjectService.delete('proj-uuid-1', 'other-user')
    ).rejects.toThrow('Only owner can delete project');
  });
});

describe('ProjectService.addMember', () => {
  it('should throw Forbidden if requester is not admin', async () => {
    vi.mocked(ProjectRepository.getMember).mockResolvedValue(mockMemberViewer);

    await expect(
      ProjectService.addMember('proj-uuid-1', 'new-user', 'member', 'user-uuid-2')
    ).rejects.toThrow('Forbidden');
  });
});
