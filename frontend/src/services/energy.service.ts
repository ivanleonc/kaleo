import {
  ENERGY_UPLOAD_PATH,
  IS_ENERGY_MOCK,
  energyClient,
} from '@/api/energy-api';
import { createMockEnergyDashboard } from '@/services/energy.mock';
import type {
  EnergyApiResponse,
  EnergyClientSegment,
  EnergyConsumptionPoint,
  EnergyCriticalZone,
  EnergyDashboard,
  EnergyDashboardApi,
  EnergyKpis,
  EnergyLossPoint,
  EnergyZoneLoss,
  EnergyZoneStatus,
} from '@/types/energy';

export interface UploadEnergyOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

function numberOr(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function stringOr(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function arrayOr<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function statusOr(value: unknown): EnergyZoneStatus {
  if (value === 'critical' || value === 'warning' || value === 'normal') {
    return value;
  }
  return 'normal';
}

function extractPayload(response: EnergyApiResponse): EnergyDashboardApi {
  if (response.success === false) {
    throw new Error(
      response.message || response.detail || 'La API no pudo procesar el archivo.',
    );
  }

  if (response.data && typeof response.data === 'object') {
    return response.data;
  }

  return response as EnergyDashboardApi;
}

export function normalizeEnergyDashboard(
  payload: EnergyDashboardApi,
  file?: File,
): EnergyDashboard {
  if (!payload || typeof payload !== 'object' || !payload.kpis) {
    throw new Error(
      'La API de energía devolvió una respuesta inválida: faltan los indicadores.',
    );
  }

  const kpisApi = payload.kpis;
  const kpis: EnergyKpis = {
    totalClients: numberOr(kpisApi.total_clients),
    totalConsumptionKwh: numberOr(kpisApi.total_consumption_kwh),
    totalBilledCop: numberOr(kpisApi.total_billed_cop),
    nonTechnicalLossesKwh: numberOr(kpisApi.non_technical_losses_kwh),
    nonTechnicalLossesPct: numberOr(kpisApi.non_technical_losses_pct),
    detectedAnomalies: numberOr(kpisApi.detected_anomalies),
    averageConsumptionKwh: numberOr(kpisApi.average_consumption_kwh),
  };

  const consumptionByPeriod: EnergyConsumptionPoint[] = arrayOr<
    NonNullable<EnergyDashboardApi['consumption_by_period']>[number]
  >(payload.consumption_by_period).map((point) => ({
    period: stringOr(point.period),
    consumptionKwh: numberOr(point.consumption_kwh),
    billedKwh: numberOr(point.billed_kwh),
  }));

  const lossesByZone: EnergyZoneLoss[] = arrayOr<
    NonNullable<EnergyDashboardApi['losses_by_zone']>[number]
  >(payload.losses_by_zone).map((zone) => ({
    zone: stringOr(zone.zone),
    lossesKwh: numberOr(zone.losses_kwh),
    lossesPct: numberOr(zone.losses_pct),
  }));

  const clientsBySegment: EnergyClientSegment[] = arrayOr<
    NonNullable<EnergyDashboardApi['clients_by_segment']>[number]
  >(payload.clients_by_segment).map((segment) => ({
    label: stringOr(segment.label),
    value: numberOr(segment.value),
  }));

  const lossTrend: EnergyLossPoint[] = arrayOr<
    NonNullable<EnergyDashboardApi['loss_trend']>[number]
  >(payload.loss_trend).map((point) => ({
    period: stringOr(point.period),
    lossesPct: numberOr(point.losses_pct),
  }));

  const criticalZones: EnergyCriticalZone[] = arrayOr<
    NonNullable<EnergyDashboardApi['critical_zones']>[number]
  >(payload.critical_zones).map((zone, index) => ({
    id: stringOr(zone.id, `zone-${index + 1}`),
    zone: stringOr(zone.zone, 'Zona sin nombre'),
    municipality: stringOr(zone.municipality, 'Sin municipio'),
    clients: numberOr(zone.clients),
    consumptionKwh: numberOr(zone.consumption_kwh),
    lossesKwh: numberOr(zone.losses_kwh),
    lossesPct: numberOr(zone.losses_pct),
    status: statusOr(zone.status),
  }));

  const metaApi = payload.meta ?? {};

  return {
    meta: {
      fileName: stringOr(metaApi.file_name, file?.name ?? 'Archivo sin nombre'),
      processedAt: stringOr(metaApi.processed_at, new Date().toISOString()),
      rowsProcessed: numberOr(metaApi.rows_processed, kpis.totalClients),
      periodFrom: stringOr(metaApi.period_from),
      periodTo: stringOr(metaApi.period_to),
      source: 'api',
    },
    kpis,
    consumptionByPeriod,
    lossesByZone,
    clientsBySegment,
    lossTrend,
    criticalZones,
  };
}

export async function uploadEnergyExcel(
  file: File,
  options: UploadEnergyOptions = {},
): Promise<EnergyDashboard> {
  if (IS_ENERGY_MOCK) {
    options.onProgress?.(15);
    const dashboard = await createMockEnergyDashboard(file);
    options.onProgress?.(100);
    return dashboard;
  }

  const formData = new FormData();
  formData.append('file', file, file.name);

  const response = await energyClient.post<EnergyApiResponse>(
    ENERGY_UPLOAD_PATH,
    formData,
    {
      signal: options.signal,
      onUploadProgress: (event) => {
        if (!event.total) return;
        const percent = Math.min(
          99,
          Math.round((event.loaded / event.total) * 100),
        );
        options.onProgress?.(percent);
      },
    },
  );

  const dashboard = normalizeEnergyDashboard(extractPayload(response.data), file);
  options.onProgress?.(100);
  return dashboard;
}

export const energyService = {
  uploadExcel: uploadEnergyExcel,
};
