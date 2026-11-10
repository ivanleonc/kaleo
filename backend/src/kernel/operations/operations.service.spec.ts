import { describe, expect, it, vi } from 'vitest';
import { OperationsService } from './operations.service.js';

function createService(overrides: Record<string, any> = {}) {
  const repository = {
    create: vi.fn(async (_companyId, _userId, kind, resource, format) => ({
      id: 'op-1',
      company_id: 'company-1',
      user_id: 'user-1',
      kind,
      resource,
      format,
      status: 'pending',
      filename: null,
      content_type: null,
      data: null,
      result: null,
      error: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    })),
    markFailed: vi.fn(async () => {}),
    get: vi.fn(async () => null),
    ...overrides,
  } as any;
  const jobs = {
    enqueue: vi.fn(async () => 'job-1'),
  } as any;
  return { service: new OperationsService(repository, jobs), repository, jobs };
}

describe('OperationsService', () => {
  it('encola una exportación con operationId', async () => {
    const { service, jobs } = createService();

    await service.requestExport('company-1', 'user-1', 'members', 'csv', {
      filters: { search: 'ana' },
      columns: ['name'],
    });

    expect(jobs.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        queue: 'export.generate',
        payload: expect.objectContaining({ operationId: 'op-1' }),
      }),
    );
  });

  it('encola un reporte de análisis', async () => {
    const { service, jobs } = createService();
    await service.requestAnalysesReport('company-1', 'user-1', 'xlsx');

    expect(jobs.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ queue: 'report.generate' }),
    );
  });

  it('encola una importación de sedes con sus filas', async () => {
    const { service, jobs } = createService();
    await service.requestBranchImport('company-1', 'user-1', [{ name: 'Sede' }]);

    expect(jobs.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        queue: 'import.branches',
        payload: expect.objectContaining({ rows: [{ name: 'Sede' }] }),
      }),
    );
  });

  it('marca la operación como fallida si no se puede encolar', async () => {
    const { service, repository, jobs } = createService();
    jobs.enqueue.mockRejectedValueOnce(new Error('queue down'));

    await expect(
      service.requestExport('company-1', 'user-1', 'members', 'csv'),
    ).rejects.toThrow('queue down');

    expect(repository.markFailed).toHaveBeenCalledWith('op-1', 'queue down');
  });
});
