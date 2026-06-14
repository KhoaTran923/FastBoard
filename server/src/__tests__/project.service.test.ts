import { ProjectService } from '../services/project.service.js';
import { ProjectRepository } from '../repositories/project.repository.js';

jest.mock('../repositories/project.repository.js', () => ({
  ProjectRepository: {
    findAllByUser: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getMemberRole: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    getMembers: jest.fn(),
  },
}));

jest.mock('../repositories/user.repository.js', () => ({
  UserRepository: {
    findByEmail: jest.fn(),
  },
}));

const ADMIN_ID = 'admin-uuid-1234';
const PROJECT_ID = 'project-uuid-1234';

const mockProject = {
  id: PROJECT_ID,
  name: 'FastBoard Dev',
  description: 'Test project',
  owner_id: ADMIN_ID,
  created_at: new Date(),
};

describe('ProjectService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getAll returns projects for user', async () => {
    (ProjectRepository.findAllByUser as jest.Mock).mockResolvedValue([mockProject]);
    const result = await ProjectService.getAll(ADMIN_ID);
    expect(result).toHaveLength(1);
  });

  it('getById throws NOT_FOUND for unknown project', async () => {
    (ProjectRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(ProjectService.getById('bad-id', ADMIN_ID)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('getById throws FORBIDDEN when user not a member', async () => {
    (ProjectRepository.findById as jest.Mock).mockResolvedValue(mockProject);
    (ProjectRepository.getMemberRole as jest.Mock).mockResolvedValue(null);
    await expect(ProjectService.getById(PROJECT_ID, 'other-user')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('update throws FORBIDDEN for non-admin', async () => {
    (ProjectRepository.getMemberRole as jest.Mock).mockResolvedValue('member');
    await expect(ProjectService.update(PROJECT_ID, 'member-id', { name: 'New' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('delete throws FORBIDDEN for non-owner', async () => {
    (ProjectRepository.findById as jest.Mock).mockResolvedValue(mockProject);
    await expect(ProjectService.delete(PROJECT_ID, 'not-owner')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
