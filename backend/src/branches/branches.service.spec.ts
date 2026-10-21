import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { BranchService } from './branches.service.js';
import { TabularExportService } from '../common/export/tabular-export.service.js';

describe('BranchService.exportBranches', () => {
  const branchRepository: any = {
    findForExport: vi.fn(),
  };

  let service: BranchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BranchService(
      branchRepository,
      new TabularExportService() as any,
    );
  });

  it('exporta solo las columnas solicitadas en CSV', async () => {
    branchRepository.findForExport.mockResolvedValue([
      {
        id: 'b-1',
        name: 'Sede Norte',
        code: 'NTE',
        is_main: false,
        city: 'Medellín',
        state: 'Antioquia',
        country: 'Colombia',
        phone: '3001234567',
        email: 'norte@x.co',
        manager_name: 'Ana',
        is_active: true,
      },
    ]);

    const file = await service.exportBranches(
      'company-1',
      {},
      { sortBy: 'name', sortDir: 'asc' },
      'csv',
      ['name', 'location'],
    );

    const text = file.buffer.toString('utf-8');
    expect(text).toContain('"Nombre","Ubicación"');
    expect(text).toContain('"Medellín, Antioquia, Colombia"');
    expect(text).not.toContain('"Contacto"');
    expect(file.filename).toMatch(/^sedes_.*\.csv$/);
  });

  it('rechaza columnas que no existen en el dominio', async () => {
    branchRepository.findForExport.mockResolvedValue([]);

    await expect(
      service.exportBranches('company-1', {}, {}, 'csv', ['columna_fantasma']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
