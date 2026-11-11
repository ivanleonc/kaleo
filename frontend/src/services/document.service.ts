import { apiClient } from '@/api/axios';
import { filenameFromDisposition, throwExportError } from '@/api/export';
import type { DocumentDetail, DocumentListItem, DocumentRecord } from '@/types/document';

interface DocumentListResponse {
  success: boolean;
  data: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
}

interface DocumentResponse {
  success: boolean;
  message?: string;
  data: DocumentDetail;
}

export interface DocumentFilters {
  search?: string;
  category?: string;
  status?: 'active' | 'archived';
  page?: number;
  limit?: number;
}

export interface UploadDocumentPayload {
  file: File;
  title?: string;
  description?: string;
  category?: string;
  entityType?: string;
  entityId?: string;
}

export interface DownloadedDocument {
  blob: Blob;
  filename: string;
}

export const documentService = {
  async list(filters: DocumentFilters = {}): Promise<DocumentListResponse> {
    const response = await apiClient.get<DocumentListResponse>('/documents', {
      params: {
        search: filters.search || undefined,
        category: filters.category || undefined,
        status: filters.status || undefined,
        page: filters.page,
        limit: filters.limit,
      },
    });
    return response.data;
  },

  async get(id: string): Promise<DocumentResponse> {
    const response = await apiClient.get<DocumentResponse>(`/documents/${id}`);
    return response.data;
  },

  async upload(payload: UploadDocumentPayload): Promise<DocumentResponse> {
    const form = new FormData();
    form.append('file', payload.file);
    if (payload.title) form.append('title', payload.title);
    if (payload.description) form.append('description', payload.description);
    if (payload.category) form.append('category', payload.category);
    if (payload.entityType) form.append('entityType', payload.entityType);
    if (payload.entityId) form.append('entityId', payload.entityId);

    const response = await apiClient.post<DocumentResponse>('/documents', form);
    return response.data;
  },

  async addVersion(id: string, file: File): Promise<DocumentResponse> {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post<DocumentResponse>(`/documents/${id}/versions`, form);
    return response.data;
  },

  async update(
    id: string,
    payload: { title?: string; description?: string; category?: string; status?: 'active' | 'archived' },
  ): Promise<{ success: boolean; data: DocumentRecord }> {
    const response = await apiClient.patch(`/documents/${id}`, payload);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },

  async download(id: string, version?: number): Promise<DownloadedDocument> {
    try {
      const response = await apiClient.get<Blob>(`/documents/${id}/download`, {
        params: version ? { version } : undefined,
        responseType: 'blob',
      });
      return {
        blob: response.data,
        filename: filenameFromDisposition(
          response.headers['content-disposition'],
          'documento',
        ),
      };
    } catch (error) {
      return throwExportError(error);
    }
  },
};
