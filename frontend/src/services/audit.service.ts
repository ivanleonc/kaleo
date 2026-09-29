import { apiClient } from '@/api/axios';
import type { AuditLogResponse } from '@/types/audit';

export const auditService = {
  async getLogs(params: {
    limit?: number;
    cursor?: string | null;
    entityType?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
  }): Promise<AuditLogResponse> {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.entityType) query.set('entityType', params.entityType);
    if (params.action) query.set('action', params.action);
    if (params.userId) query.set('userId', params.userId);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);

    const response = await apiClient.get(`/audit/logs?${query.toString()}`);
    return response.data;
  },

  async getEntityTypes(): Promise<{ success: boolean; data: string[] }> {
    const response = await apiClient.get('/audit/entity-types');
    return response.data;
  },

  async fetchCsvBlob(params: {
    entityType?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
  }): Promise<{ blob: Blob; filename: string }> {
    const query = new URLSearchParams();
    if (params.entityType) query.set('entityType', params.entityType);
    if (params.action) query.set('action', params.action);
    if (params.userId) query.set('userId', params.userId);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);

    const response = await apiClient.get(`/audit/logs/export?${query.toString()}`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const filename = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    return { blob, filename };
  },

  async exportCsv(params: {
    entityType?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
  }): Promise<void> {
    const { blob, filename } = await this.fetchCsvBlob(params);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  },
};
