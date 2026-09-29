import { apiClient } from '@/api/axios';
import type { ApiResponse } from '@/types/api';

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  position?: string;
  document_type?: string;
  document_number?: string;
  timezone?: string;
  locale?: string;
}

export const userService = {
  async updateProfile(payload: UpdateProfilePayload): Promise<ApiResponse<{ pending_email: string | null }>> {
    const response = await apiClient.put<ApiResponse<{ pending_email: string | null }>>('/auth/profile', payload);
    return response.data;
  },
};