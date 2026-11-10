import { apiClient } from '@/api/axios';
import type {
  AcceptInvitationResponse,
  CreateInvitationPayload,
  CreatedInvitationResponse,
  InvitationPreviewResponse,
  PendingInvitationsResponse,
} from '@/types/invitation';

function companyHeaders(companyId: string) {
  return { headers: { 'x-company-id': companyId } };
}

export const invitationService = {
  async create(companyId: string, payload: CreateInvitationPayload): Promise<CreatedInvitationResponse> {
    const response = await apiClient.post<CreatedInvitationResponse>(
      '/companies/users/invitations',
      payload,
      companyHeaders(companyId),
    );
    return response.data;
  },

  async list(companyId: string): Promise<PendingInvitationsResponse> {
    const response = await apiClient.get<PendingInvitationsResponse>(
      '/companies/users/invitations',
      companyHeaders(companyId),
    );
    return response.data;
  },

  async revoke(companyId: string, invitationId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(
      `/companies/users/invitations/${invitationId}`,
      companyHeaders(companyId),
    );
    return response.data;
  },

  async preview(token: string): Promise<InvitationPreviewResponse> {
    const response = await apiClient.get<InvitationPreviewResponse>(
      `/auth/invitations/${encodeURIComponent(token)}`,
    );
    return response.data;
  },

  async accept(payload: { token: string; name: string; password: string }): Promise<AcceptInvitationResponse> {
    const response = await apiClient.post<AcceptInvitationResponse>(
      '/auth/invitations/accept',
      payload,
    );
    return response.data;
  },

  async acceptAuthenticated(token: string): Promise<AcceptInvitationResponse> {
    const response = await apiClient.post<AcceptInvitationResponse>(
      '/auth/invitations/accept-authenticated',
      { token },
    );
    return response.data;
  },
};
