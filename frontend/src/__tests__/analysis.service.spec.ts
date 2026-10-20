import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Analysis,
  AnalysisDetail,
  AnalysesResponse,
  CreateAnalysisPayload,
} from '@/types/analysis';

const { mockGet, mockPost, mockPatch, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/api/axios', () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    delete: mockDelete,
  },
}));

import { analysisService } from '@/services/analysis.service';

const ANALYSIS: Analysis = {
  id: 'analysis-1',
  company_id: 'company-1',
  created_by: 'user-1',
  created_by_name: 'Ana',
  name: 'Facturación enero',
  analysis_type: 'energy',
  source: 'api',
  file_name: 'enero.xlsx',
  file_size: 2048,
  summary: {
    periodFrom: '2026-01-01',
    periodTo: '2026-01-31',
    rowsProcessed: 10,
    kpis: {},
  },
  created_at: '2026-02-01T10:00:00.000Z',
  updated_at: '2026-02-01T10:00:00.000Z',
};

const DETAIL: AnalysisDetail = {
  ...ANALYSIS,
  result: {
    meta: {
      fileName: 'enero.xlsx',
      processedAt: '2026-02-01T10:00:00.000Z',
      rowsProcessed: 10,
      periodFrom: '2026-01-01',
      periodTo: '2026-01-31',
      source: 'api',
    },
    kpis: {
      totalClients: 10,
      totalConsumptionKwh: 1000,
      totalBilledCop: 500000,
      nonTechnicalLossesKwh: 50,
      nonTechnicalLossesPct: 5,
      detectedAnomalies: 1,
      averageConsumptionKwh: 100,
    },
    consumptionByPeriod: [],
    lossesByZone: [],
    clientsBySegment: [],
    lossTrend: [],
    criticalZones: [],
  },
};

const PAGE: AnalysesResponse = {
  success: true,
  data: [ANALYSIS],
  total: 1,
  page: 1,
  limit: 20,
};

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPatch.mockReset();
  mockDelete.mockReset();
});

describe('analysisService', () => {
  it('lista los análisis con filtros y paginación', async () => {
    mockGet.mockResolvedValue({ data: PAGE });
    const params = { page: 2, limit: 10, search: 'enero', sortBy: 'name', sortDir: 'asc' as const };

    await expect(analysisService.getAnalyses(params)).resolves.toEqual(PAGE);
    expect(mockGet).toHaveBeenCalledWith('/companies/analyses', { params });
  });

  it('obtiene el detalle con resultado completo', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: DETAIL } });

    await expect(analysisService.getAnalysis('analysis-1')).resolves.toEqual({
      success: true,
      data: DETAIL,
    });
    expect(mockGet).toHaveBeenCalledWith('/companies/analyses/analysis-1');
  });

  it('crea un análisis con el contrato esperado', async () => {
    const payload: CreateAnalysisPayload = {
      name: 'Facturación enero',
      analysis_type: 'energy',
      file_name: 'enero.xlsx',
      file_size: 2048,
      result: DETAIL.result as Record<string, unknown>,
    };
    mockPost.mockResolvedValue({ data: { success: true, data: ANALYSIS } });

    await expect(analysisService.createAnalysis(payload)).resolves.toEqual({
      success: true,
      data: ANALYSIS,
    });
    expect(mockPost).toHaveBeenCalledWith('/companies/analyses', payload);
  });

  it('renombra y elimina usando el id del análisis', async () => {
    mockPatch.mockResolvedValue({
      data: { success: true, data: { ...ANALYSIS, name: 'Nuevo nombre' } },
    });
    mockDelete.mockResolvedValue({ data: { success: true } });

    await analysisService.renameAnalysis('analysis-1', { name: 'Nuevo nombre' });
    await analysisService.deleteAnalysis('analysis-1');

    expect(mockPatch).toHaveBeenCalledWith('/companies/analyses/analysis-1', {
      name: 'Nuevo nombre',
    });
    expect(mockDelete).toHaveBeenCalledWith('/companies/analyses/analysis-1');
  });
});
