import { describe, expect, it, vi } from 'vitest';
import { EstimatingController } from './estimating.controller.js';
import type { ImportApusDto } from './dto/estimating.dto.js';

const IMPORT_RESULT = {
  apusCreated: 1,
  apusUpdated: 0,
  linesCreated: 1,
  resourcesCreated: 0,
  errors: [],
};

function createController() {
  const estimating = {
    importApus: vi.fn(async () => IMPORT_RESULT),
  };
  const controller = new EstimatingController(estimating as any);
  return { controller, estimating };
}

function buildCsv(unitHeader: string): string {
  return [
    `apu_codigo,apu_nombre,${unitHeader},insumo_codigo,insumo_nombre,tipo,unidad_insumo,cantidad,desperdicio,rendimiento,costo,moneda,notas`,
    'APU-ENCH-001,Enchape ceramico,m2,MAT-CEM-001,Cemento,material,un,0.22,5,1,32500,COP,Mortero de pega',
  ].join('\n');
}

async function importCsv(
  controller: EstimatingController,
  unitHeader: string,
): Promise<ReturnType<EstimatingController['importApus']>> {
  return controller.importApus(
    'user-1',
    'company-1',
    { baseId: 'base-1' } as ImportApusDto,
    { buffer: Buffer.from(buildCsv(unitHeader)), originalname: 'apus.csv' },
  );
}

describe('EstimatingController importApus', () => {
  it.each(['apu_unidad', 'unidad_apu', 'unidad_salida', 'unidad'])(
    'reconoce el encabezado de unidad de salida "%s"',
    async (unitHeader) => {
      const { controller, estimating } = createController();

      const result = await importCsv(controller, unitHeader);

      expect(estimating.importApus).toHaveBeenCalledWith(
        'company-1',
        'user-1',
        'base-1',
        [
          expect.objectContaining({
            apu_code: 'APU-ENCH-001',
            apu_name: 'Enchape ceramico',
            apu_unit: 'm2',
            resource_code: 'MAT-CEM-001',
            resource_unit: 'un',
            quantity: '0.22',
            waste_pct: '5',
            performance: '1',
            cost: '32500',
            currency: 'COP',
          }),
        ],
      );
      expect(result.message).toBe('Importación procesada');
    },
  );

  it('exige el header x-company-id', async () => {
    const { controller } = createController();

    await expect(
      controller.importApus(
        'user-1',
        undefined,
        { baseId: 'base-1' } as ImportApusDto,
        { buffer: Buffer.from(buildCsv('apu_unidad')), originalname: 'apus.csv' },
      ),
    ).rejects.toThrow('Falta el header x-company-id');
  });
});
