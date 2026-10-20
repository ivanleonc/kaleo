import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnergyDashboardApi } from '@/types/energy';

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock('@/api/energy-api', () => ({
  ENERGY_UPLOAD_PATH: '/energy/upload/',
  IS_ENERGY_MOCK: false,
  energyClient: { post: mockPost },
}));

import {
  normalizeEnergyDashboard,
  uploadEnergyExcel,
} from '@/services/energy.service';

const API_PAYLOAD: EnergyDashboardApi = {
  meta: {
    file_name: 'facturacion_cauca.xlsx',
    processed_at: '2026-01-15T10:00:00.000Z',
    rows_processed: 1200,
    period_from: '2025-12-01',
    period_to: '2025-12-31',
  },
  kpis: {
    total_clients: 1200,
    total_consumption_kwh: 240000,
    total_billed_cop: 180000000,
    non_technical_losses_kwh: 21000,
    non_technical_losses_pct: 8.75,
    detected_anomalies: 34,
    average_consumption_kwh: 200,
  },
  consumption_by_period: [
    { period: '2025-12-01', consumption_kwh: 7800, billed_kwh: 7100 },
  ],
  losses_by_zone: [
    { zone: 'Norte', losses_kwh: 9000, losses_pct: 11.2 },
  ],
  clients_by_segment: [
    { label: 'Residencial', value: 980 },
    { label: 'Comercial', value: 220 },
  ],
  loss_trend: [
    { period: '2025-11-01', losses_pct: 9.8 },
    { period: '2025-12-01', losses_pct: 8.75 },
  ],
  critical_zones: [
    {
      id: 'zone-1',
      zone: 'Circuito 12',
      municipality: 'Popayán',
      clients: 320,
      consumption_kwh: 64000,
      losses_kwh: 7200,
      losses_pct: 11.25,
      status: 'critical',
    },
  ],
};

function makeFile(name = 'facturacion_cauca.xlsx'): File {
  return new File(['contenido'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified: 1768471200000,
  });
}

beforeEach(() => {
  mockPost.mockReset();
});

describe('normalizeEnergyDashboard', () => {
  it('convierte snake_case al modelo camelCase del dashboard', () => {
    const dashboard = normalizeEnergyDashboard(API_PAYLOAD, makeFile());

    expect(dashboard.meta).toMatchObject({
      fileName: 'facturacion_cauca.xlsx',
      rowsProcessed: 1200,
      periodFrom: '2025-12-01',
      periodTo: '2025-12-31',
      source: 'api',
    });
    expect(dashboard.kpis).toMatchObject({
      totalClients: 1200,
      totalConsumptionKwh: 240000,
      totalBilledCop: 180000000,
      nonTechnicalLossesPct: 8.75,
      detectedAnomalies: 34,
      averageConsumptionKwh: 200,
    });
    expect(dashboard.consumptionByPeriod[0]).toEqual({
      period: '2025-12-01',
      consumptionKwh: 7800,
      billedKwh: 7100,
    });
    expect(dashboard.criticalZones[0]).toMatchObject({
      id: 'zone-1',
      municipality: 'Popayán',
      status: 'critical',
    });
  });

  it('usa valores seguros cuando la API omite campos', () => {
    const dashboard = normalizeEnergyDashboard({ kpis: {} }, makeFile('respaldo.xls'));

    expect(dashboard.kpis.totalClients).toBe(0);
    expect(dashboard.consumptionByPeriod).toEqual([]);
    expect(dashboard.criticalZones).toEqual([]);
    expect(dashboard.meta.fileName).toBe('respaldo.xls');
    expect(dashboard.meta.processedAt).toBeTruthy();
    expect(dashboard.meta.source).toBe('api');
  });

  it('convierte números serializados como texto por Django', () => {
    const dashboard = normalizeEnergyDashboard({
      kpis: {
        total_clients: '1200' as unknown as number,
        total_consumption_kwh: '240000.50' as unknown as number,
        non_technical_losses_pct: '8.75' as unknown as number,
      },
      critical_zones: [
        {
          zone: 'Circuito 12',
          losses_pct: '11.25' as unknown as number,
          status: 'critical',
        },
      ],
    });

    expect(dashboard.kpis.totalClients).toBe(1200);
    expect(dashboard.kpis.totalConsumptionKwh).toBe(240000.5);
    expect(dashboard.kpis.nonTechnicalLossesPct).toBe(8.75);
    expect(dashboard.criticalZones[0]?.lossesPct).toBe(11.25);
  });

  it('rechaza respuestas sin indicadores', () => {
    expect(() => normalizeEnergyDashboard({})).toThrow(
      /faltan los indicadores/,
    );
  });
});

describe('uploadEnergyExcel', () => {
  it('envía multipart al endpoint configurado y normaliza la respuesta', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: API_PAYLOAD },
    });
    const file = makeFile();
    const progress: number[] = [];

    const pending = uploadEnergyExcel(file, {
      onProgress: (percent) => progress.push(percent),
    });
    const [url, body, config] = mockPost.mock.calls[0] ?? [];
    config.onUploadProgress({ loaded: 50, total: 100 });
    const dashboard = await pending;

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(url).toBe('/energy/upload/');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toMatchObject({
      name: file.name,
      size: file.size,
    });
    expect(config.signal).toBeUndefined();
    expect(progress).toEqual([50, 100]);
    expect(dashboard.kpis.totalClients).toBe(1200);
  });

  it('propaga el mensaje de error de la API', async () => {
    mockPost.mockResolvedValue({
      data: { success: false, message: 'El Excel no contiene la columna consumo.' },
    });

    await expect(uploadEnergyExcel(makeFile())).rejects.toThrow(
      'El Excel no contiene la columna consumo.',
    );
  });

  it('rechaza una respuesta exitosa sin datos del dashboard', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: {} } });

    await expect(uploadEnergyExcel(makeFile())).rejects.toThrow(
      /faltan los indicadores/,
    );
  });
});
