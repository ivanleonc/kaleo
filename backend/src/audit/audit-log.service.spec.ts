import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditLogService } from './audit-log.service.js';
import { TabularExportService } from '../common/export/tabular-export.service.js';

describe('AuditLogService.exportLogs', () => {
  const auditLogRepository: any = {
    findForExport: vi.fn(),
  };

  let service: AuditLogService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuditLogService(
      auditLogRepository,
      new TabularExportService() as any,
    );
  });

  it('exporta el log en CSV con las columnas pedidas', async () => {
    auditLogRepository.findForExport.mockResolvedValue([
      {
        action: 'POST /members',
        entity_type: 'member',
        entity_id: 'u-1',
        old_values: null,
        new_values: { name: 'Ana' },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla Chrome',
        created_at: '2026-02-01T00:00:00.000Z',
        user_name: 'Ana',
        user_email: 'ana@x.co',
      },
    ]);

    const file = await service.exportLogs({
      companyId: 'company-1',
      format: 'csv',
      columns: ['created_at', 'action'],
    });

    const text = file.buffer.toString('utf-8');
    expect(text).toContain('"Fecha","Acción"');
    expect(text).not.toContain('"Email"');
    expect(file.filename).toMatch(/^auditoria_.*\.csv$/);
  });

  it('genera un xlsx cuando se pide ese formato', async () => {
    auditLogRepository.findForExport.mockResolvedValue([]);

    const file = await service.exportLogs({
      companyId: 'company-1',
      format: 'xlsx',
    });

    expect(file.filename).toMatch(/\.xlsx$/);
    expect(file.contentType).toContain('spreadsheetml');
  });
});
