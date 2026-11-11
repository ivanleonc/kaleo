import { apiClient } from '@/api/axios';
import type { AppNotification, NotificationPreference } from '@/types/notification';

interface NotificationListResponse {
  success: boolean;
  data: {
    items: AppNotification[];
    unreadCount: number;
  };
}

interface NotificationResponse {
  success: boolean;
  message?: string;
  data: AppNotification;
}

interface CountResponse {
  success: boolean;
  data: { count: number };
}

interface PreferencesResponse {
  success: boolean;
  message?: string;
  data: NotificationPreference[];
}

export const notificationService = {
  async list(options: { unreadOnly?: boolean; limit?: number } = {}): Promise<NotificationListResponse> {
    const response = await apiClient.get<NotificationListResponse>('/notifications', {
      params: {
        unreadOnly: options.unreadOnly || undefined,
        limit: options.limit,
      },
    });
    return response.data;
  },

  async unreadCount(): Promise<number> {
    const response = await apiClient.get<CountResponse>('/notifications/unread-count');
    return response.data.data.count;
  },

  async markRead(id: string): Promise<NotificationResponse> {
    const response = await apiClient.post<NotificationResponse>(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllRead(): Promise<number> {
    const response = await apiClient.post<{ success: boolean; data: { updated: number } }>(
      '/notifications/read-all',
    );
    return response.data.data.updated;
  },

  async getPreferences(): Promise<PreferencesResponse> {
    const response = await apiClient.get<PreferencesResponse>('/notifications/preferences');
    return response.data;
  },

  async updatePreferences(
    preferences: Array<{ category: string; inApp: boolean; email: boolean }>,
  ): Promise<PreferencesResponse> {
    const response = await apiClient.put<PreferencesResponse>('/notifications/preferences', {
      preferences,
    });
    return response.data;
  },
};
