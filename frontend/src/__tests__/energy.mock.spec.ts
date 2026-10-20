import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildMockEnergyDashboard } from '@/services/energy.mock';

afterEach(() => {
  vi.useRealTimers();
});

function makeFile(name = 'facturacion_cauca.xlsx', size = 2048): File {
  return new File([new Uint8Array(size)], name, { lastModified: 1768471200000 });
}

describe('buildMockEnergyDashboard', () => {
  it('genera un dashboard completo con datos de demostración', () => {
    const dashboard = buildMockEnergyDashboard(makeFile());

    expect(dashboard.meta.source).toBe('mock');
    expect(dashboard.meta.fileName).toBe('facturacion_cauca.xlsx');
    expect(dashboard.kpis.totalClients).toBeGreaterThan(479000);
    expect(dashboard.kpis.totalConsumptionKwh).toBeGreaterThan(0);
    expect(dashboard.kpis.nonTechnicalLossesPct).toBeGreaterThan(0);
    expect(dashboard.consumptionByPeriod.length).toBeGreaterThanOrEqual(6);
    expect(dashboard.lossesByZone.length).toBeGreaterThan(0);
    expect(dashboard.clientsBySegment.length).toBeGreaterThan(0);
    expect(dashboard.lossTrend.length).toBeGreaterThan(0);
    expect(dashboard.criticalZones.length).toBeGreaterThan(0);
    expect(dashboard.criticalZones[0]?.municipality).toBeTruthy();
  });

  it('es determinista para el mismo archivo', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));

    const first = buildMockEnergyDashboard(makeFile());
    const second = buildMockEnergyDashboard(makeFile());

    expect(first).toEqual(second);
  });

  it('cambia los datos cuando cambia el archivo', () => {
    const first = buildMockEnergyDashboard(makeFile('enero.xlsx'));
    const second = buildMockEnergyDashboard(makeFile('febrero.xlsx'));

    expect(first.kpis.totalClients).not.toBe(second.kpis.totalClients);
  });
});
