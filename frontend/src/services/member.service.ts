import { apiClient } from '@/api/axios';
import type { MembersResponse, CreateMemberResponse, CreateMemberPayload, UpdateMemberPayload, AttachMemberPayload, UserSearchResult, MemberCompany } from '@/types/member';

/** Header por request para operar sobre una empresa distinta a la activa. */
function companyHeaders(companyId: string) {
  return { headers: { 'x-company-id': companyId } };
}

export const memberService = {
  async getMembers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    roleId?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }): Promise<MembersResponse> {
    const response = await apiClient.get<MembersResponse>('/companies/users', { params });
    return response.data;
  },

  async addMember(payload: CreateMemberPayload): Promise<CreateMemberResponse> {
    const response = await apiClient.post<CreateMemberResponse>('/companies/users', payload);
    return response.data;
  },

  async updateMember(userId: string, payload: UpdateMemberPayload) {
    const response = await apiClient.patch(`/companies/users/${userId}`, payload);
    return response.data;
  },

  async removeMember(userId: string) {
    const response = await apiClient.delete(`/companies/users/${userId}`);
    return response.data;
  },

  async resetPassword(userId: string) {
    const response = await apiClient.post(`/companies/users/${userId}/reset-password`);
    return response.data;
  },

  async resetPasswordAndSendEmail(userId: string) {
    const response = await apiClient.post(`/companies/users/${userId}/reset-password-email`);
    return response.data;
  },

  /**
   * Asigna un usuario a una empresa explícita (puede diferir de la activa).
   * El header viaja por request para no mutar el tenant activo global.
   */
  async attachToCompany(companyId: string, payload: AttachMemberPayload) {
    const response = await apiClient.post(
      `/companies/${companyId}/members`,
      payload,
      companyHeaders(companyId),
    );
    return response.data;
  },

  /** Quita un miembro de una empresa explícita. */
  async removeFromCompany(companyId: string, userId: string) {
    const response = await apiClient.delete(
      `/companies/${companyId}/members/${userId}`,
      companyHeaders(companyId),
    );
    return response.data;
  },

  /** Busca usuarios por nombre/email para autocompletar (mínimo 2 caracteres). */
  async searchUsers(query: string): Promise<{ success: boolean; data: UserSearchResult[] }> {
    const response = await apiClient.get('/companies/users/search', { params: { q: query } });
    return response.data;
  },

  /** Empresas (con roles) a las que pertenece un miembro. */
  async getUserCompanies(userId: string): Promise<{ success: boolean; data: MemberCompany[] }> {
    const response = await apiClient.get(`/companies/users/${userId}/companies`);
    return response.data;
  },
};
