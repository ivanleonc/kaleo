import { apiClient } from '@/api/axios';
import { fetchExportFile, type ExportedFile, type ExportFormat } from '@/api/export';
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

  async exportLogs(params: {
    entityType?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
    format: ExportFormat;
    columns?: string[];
  }): Promise<ExportedFile> {
    return fetchExportFile('/audit/logs/export', {
      ...params,
      columns: params.columns?.join(','),
    });
  },
};
