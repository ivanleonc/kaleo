import { apiClient } from '@/api/axios';
import type {
  CreateProjectPayload,
  Project,
  ProjectDetail,
  ProjectMember,
  ProjectRole,
  ProjectStatus,
} from '@/types/project';

interface ProjectListResponse {
  success: boolean;
  data: Project[];
  total: number;
  page: number;
  limit: number;
}

interface ProjectResponse {
  success: boolean;
  message?: string;
  data: ProjectDetail;
}

export const projectService = {
  async list(filters: {
    search?: string;
    status?: ProjectStatus;
    branchId?: string;
    clientPartyId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ProjectListResponse> {
    const response = await apiClient.get<ProjectListResponse>('/projects', {
      params: {
        search: filters.search || undefined,
        status: filters.status || undefined,
        branchId: filters.branchId || undefined,
        clientPartyId: filters.clientPartyId || undefined,
        page: filters.page,
        limit: filters.limit,
      },
    });
    return response.data;
  },

  async get(id: string): Promise<ProjectDetail> {
    const response = await apiClient.get<ProjectResponse>(`/projects/${id}`);
    return response.data.data;
  },

  async create(payload: CreateProjectPayload): Promise<ProjectDetail> {
    const response = await apiClient.post<ProjectResponse>('/projects', payload);
    return response.data.data;
  },

  async update(id: string, payload: Partial<CreateProjectPayload>): Promise<ProjectDetail> {
    const response = await apiClient.patch<ProjectResponse>(`/projects/${id}`, payload);
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },

  async listMembers(id: string): Promise<ProjectMember[]> {
    const response = await apiClient.get<{ success: boolean; data: ProjectMember[] }>(
      `/projects/${id}/members`,
    );
    return response.data.data;
  },

  async addMember(
    id: string,
    payload: { userId: string; projectRole: ProjectRole },
  ): Promise<ProjectMember> {
    const response = await apiClient.post<{ success: boolean; data: ProjectMember }>(
      `/projects/${id}/members`,
      payload,
    );
    return response.data.data;
  },

  async updateMemberRole(
    id: string,
    membershipId: string,
    projectRole: ProjectRole,
  ): Promise<ProjectMember> {
    const response = await apiClient.patch<{ success: boolean; data: ProjectMember }>(
      `/projects/${id}/members/${membershipId}`,
      { projectRole },
    );
    return response.data.data;
  },

  async removeMember(id: string, membershipId: string): Promise<void> {
    await apiClient.delete(`/projects/${id}/members/${membershipId}`);
  },
};
