import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysesService } from './analyses.service.js';
import { createEnergyResult } from './testing/energy-result.fixture.js';

function createRepositoryStub() {
  return {
    findPagedByCompany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    rename: vi.fn(),
    softDelete: vi.fn(),
  };
}

function analysisRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'analysis-1',
    company_id: 'company-1',
    created_by: 'user-1',
    created_by_name: 'Ana',
    name: 'Enero',
    analysis_type: 'energy',
    source: 'api',
    file_name: 'enero.xlsx',
    file_size: 120,
    summary: { periodFrom: '2026-01-01' },
    result: createEnergyResult(),
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AnalysesService', () => {
  let repository: ReturnType<typeof createRepositoryStub>;
  let service: AnalysesService;

  beforeEach(() => {
    repository = createRepositoryStub();
    service = new AnalysesService(repository as any);
  });

  it('lista análisis sin incluir el resultado completo', async () => {
    repository.findPagedByCompany.mockResolvedValue({
      data: [analysisRow()],
      total: 1,
      page: 1,
      limit: 20,
    });

    const result = await service.getAnalyses('company-1');

    expect(result.data[0]).not.toHaveProperty('result');
    expect(result.data[0].summary).toEqual({ periodFrom: '2026-01-01' });
  });

  it('crea un análisis de energía derivando source y summary', async () => {
    repository.create.mockImplementation(async (_companyId, _userId, data) => analysisRow({
      source: data.source,
      summary: data.summary,
    }));

    const result = await service.createAnalysis('company-1', 'user-1', {
      name: 'Enero',
      analysis_type: 'energy',
      file_name: 'enero.xlsx',
      file_size: 120,
      result: createEnergyResult(),
    });

    expect(repository.create).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.objectContaining({
        source: 'api',
        summary: expect.objectContaining({
          periodFrom: '2026-01-01',
          periodTo: '2026-01-31',
          rowsProcessed: 120,
        }),
      }),
    );
    expect(result).not.toHaveProperty('result');
  });

  it('exige metadatos del archivo para energía', async () => {
    await expect(service.createAnalysis('company-1', 'user-1', {
      name: 'Enero',
      analysis_type: 'energy',
      file_size: 120,
      result: createEnergyResult(),
    } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza resultados de energía inválidos', async () => {
    await expect(service.createAnalysis('company-1', 'user-1', {
      name: 'Enero',
      analysis_type: 'energy',
      file_name: 'enero.xlsx',
      file_size: 120,
      result: { meta: {} },
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza tipos no soportados', async () => {
    await expect(service.createAnalysis('company-1', 'user-1', {
      name: 'Otro',
      analysis_type: 'other',
      file_name: 'otro.xlsx',
      file_size: 120,
      result: {},
    } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('devuelve 404 si el análisis no existe', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getAnalysisById('company-1', 'analysis-1'))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('renombra y falla con 404 si no existe', async () => {
    repository.rename.mockResolvedValue(null);

    await expect(service.renameAnalysis('company-1', 'analysis-1', 'Nuevo'))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('elimina y falla con 404 si no existe', async () => {
    repository.softDelete.mockResolvedValue(false);

    await expect(service.deleteAnalysis('company-1', 'analysis-1'))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
