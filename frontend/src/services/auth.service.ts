import { apiClient } from '@/api/axios';
import type { ApiResponse } from '@/types/api';
import type { LoginPayload, RegisterPayload, AuthResponse, ProfileResponse, TokenPair } from '@/types/auth';

export class AuthService {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload);
    return response.data;
  }

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload);
    return response.data;
  }

  async refresh(refreshToken: string): Promise<{ success: boolean; data: TokenPair }> {
    const response = await apiClient.post<{ success: boolean; data: TokenPair }>('/auth/refresh', { refreshToken });
    return response.data;
  }

  async logout(refreshToken?: string): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken });
  }

  async getProfile(): Promise<ProfileResponse> {
    const response = await apiClient.get<ProfileResponse>('/auth/me');
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  async changeTemporaryPassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/change-temporary-password', {
      newPassword,
    });
    return response.data;
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(email: string, token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/reset-password', {
      email,
      token,
      newPassword,
    });
    return response.data;
  }

  async resendEmailVerification(): Promise<{ success: boolean; email: string }> {
    const response = await apiClient.post<ApiResponse<{ email: string }>>('/auth/profile/email/resend');
    return { success: response.data.success, email: response.data.data?.email ?? '' };
  }

  async cancelEmailChange(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/profile/email/cancel');
    return response.data;
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  }
}

export const authService = new AuthService();
