import api from './http';
import type { ApiResponse, InvitePreview, ProjectInvite, UserRole } from '../types';

export async function createInvite(
  projectId: string,
  role: UserRole,
  expiresInDays?: number
): Promise<ProjectInvite> {
  const { data } = await api.post<ApiResponse<ProjectInvite>>(`/projects/${projectId}/invites`, {
    role,
    expires_in_days: expiresInDays,
  });
  return data.data as ProjectInvite;
}

export async function getInvitePreview(token: string): Promise<InvitePreview> {
  const { data } = await api.get<ApiResponse<InvitePreview>>(`/invites/${token}`);
  return data.data as InvitePreview;
}

export async function acceptInvite(
  token: string
): Promise<{ project_id: string; already_member: boolean }> {
  const { data } = await api.post<ApiResponse<{ project_id: string; already_member: boolean }>>(
    `/invites/${token}/accept`
  );
  return data.data as { project_id: string; already_member: boolean };
}

/** Builds the URL a teammate opens to join the project. */
export function inviteUrl(token: string): string {
  return `${window.location.origin}/invite/${token}`;
}
