import { apiClient } from '@/api/axios';
import type { ShareLink, ShareScope, SharedProjectPayload } from '@/types/project-share';

interface DataResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const shareService = {
  async list(projectId: string): Promise<ShareLink[]> {
    const response = await apiClient.get<DataResponse<ShareLink[]>>(
      `/projects/${projectId}/shares`,
    );
    return response.data.data;
  },

  async create(
    projectId: string,
    payload: { label?: string | null; scope?: ShareScope; expiresInDays?: number | null },
  ): Promise<ShareLink> {
    const response = await apiClient.post<DataResponse<ShareLink>>(
      `/projects/${projectId}/shares`,
      payload,
    );
    return response.data.data;
  },

  async revoke(projectId: string, id: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/shares/${id}`);
  },

  async resolvePublic(token: string): Promise<SharedProjectPayload> {
    const response = await apiClient.get<DataResponse<SharedProjectPayload>>(
      `/public/shares/${encodeURIComponent(token)}`,
    );
    return response.data.data;
  },
};
