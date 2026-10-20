import { describe, expect, it } from 'vitest';
import { parseEnergyResult } from './energy-result.validator.js';
import { createEnergyResult } from '../testing/energy-result.fixture.js';

describe('parseEnergyResult', () => {
  it('normaliza un resultado válido', () => {
    const parsed = parseEnergyResult(createEnergyResult());

    expect(parsed.meta.source).toBe('api');
    expect(parsed.kpis.totalClients).toBe(100);
    expect(parsed.criticalZones[0]?.status).toBe('critical');
  });

  it('rechaza un origen no soportado', () => {
    const result = createEnergyResult();
    result.meta.source = 'manual';

    expect(() => parseEnergyResult(result)).toThrow('meta.source');
  });

  it('rechaza KPIs inválidos', () => {
    const result = createEnergyResult();
    (result.kpis as { totalClients: unknown }).totalClients = '100';

    expect(() => parseEnergyResult(result)).toThrow('kpis.totalClients');
  });

  it('rechaza arrays faltantes', () => {
    const result = createEnergyResult();
    (result as { criticalZones?: unknown }).criticalZones = undefined;

    expect(() => parseEnergyResult(result)).toThrow('criticalZones');
  });

  it('rechaza estados de zona desconocidos', () => {
    const result = createEnergyResult();
    result.criticalZones[0].status = 'unknown';

    expect(() => parseEnergyResult(result)).toThrow('criticalZones[0].status');
  });
});
