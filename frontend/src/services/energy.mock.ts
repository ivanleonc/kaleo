import type {
  EnergyClientSegment,
  EnergyConsumptionPoint,
  EnergyCriticalZone,
  EnergyDashboard,
  EnergyLossPoint,
  EnergyZoneLoss,
  EnergyZoneStatus,
} from '@/types/energy';

const PERIODS = [
  '2025-01',
  '2025-02',
  '2025-03',
  '2025-04',
  '2025-05',
  '2025-06',
  '2025-07',
  '2025-08',
  '2025-09',
  '2025-10',
  '2025-11',
  '2025-12',
];

const ZONES = [
  { zone: 'Popayán', municipality: 'Popayán' },
  { zone: 'Santander de Quilichao', municipality: 'Santander de Quilichao' },
  { zone: 'Puerto Tejada', municipality: 'Puerto Tejada' },
  { zone: 'Patía', municipality: 'Patía' },
  { zone: 'Timbío', municipality: 'Timbío' },
  { zone: 'Piendamó', municipality: 'Piendamó' },
  { zone: 'El Bordo', municipality: 'El Bordo' },
  { zone: 'Corinto', municipality: 'Corinto' },
];

const SEGMENTS = [
  { label: 'Residencial', share: 0.79 },
  { label: 'Comercial', share: 0.12 },
  { label: 'Industrial', share: 0.05 },
  { label: 'Oficial', share: 0.025 },
  { label: 'Especial', share: 0.015 },
];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function between(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function distribute(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const values = weights.map((weight) => Math.round((total * weight) / weightSum));
  const difference = total - values.reduce((sum, value) => sum + value, 0);
  values[values.length - 1] = (values[values.length - 1] ?? 0) + difference;
  return values;
}

function statusFor(lossesPct: number): EnergyZoneStatus {
  if (lossesPct >= 14) return 'critical';
  if (lossesPct >= 10) return 'warning';
  return 'normal';
}

export function buildMockEnergyDashboard(file: File): EnergyDashboard {
  const random = mulberry32(
    hashString(`${file.name}:${file.size}:${file.lastModified}`),
  );

  const totalClients = 479000 + Math.round(random() * 3200);
  const averageConsumptionKwh = round(between(random, 155, 235));
  const totalConsumptionKwh = Math.round(totalClients * averageConsumptionKwh);
  const nonTechnicalLossesPct = round(between(random, 6.8, 14.6), 1);
  const nonTechnicalLossesKwh = Math.round(
    (totalConsumptionKwh * nonTechnicalLossesPct) / 100,
  );
  const totalBilledCop = Math.round(
    (totalConsumptionKwh - nonTechnicalLossesKwh) * between(random, 430, 560),
  );
  const detectedAnomalies = Math.round(between(random, 850, 3600));

  const monthlyWeights = PERIODS.map(
    (_, index) =>
      1 +
      Math.sin(((index - 2) / PERIODS.length) * Math.PI * 2) * 0.12 +
      random() * 0.08,
  );
  const monthlyConsumption = distribute(totalConsumptionKwh, monthlyWeights);

  const consumptionByPeriod: EnergyConsumptionPoint[] = PERIODS.map(
    (period, index) => {
      const consumptionKwh = monthlyConsumption[index] ?? 0;
      const billedKwh = Math.round(
        consumptionKwh *
          (1 - nonTechnicalLossesPct / 100) *
          between(random, 0.98, 1.01),
      );
      return {
        period,
        consumptionKwh,
        billedKwh: Math.min(consumptionKwh, billedKwh),
      };
    },
  );

  const lossTrend: EnergyLossPoint[] = PERIODS.map((period, index) => ({
    period,
    lossesPct: round(
      Math.min(
        22,
        Math.max(
          3,
          nonTechnicalLossesPct +
            (index - 6) * 0.08 +
            between(random, -1.1, 1.1),
        ),
      ),
      1,
    ),
  }));

  const zoneLossPcts = ZONES.map((_, index) => {
    if (index === 0) return round(between(random, 15.4, 18.5), 1);
    if (index === 1) return round(between(random, 12.2, 14.8), 1);
    return round(between(random, 5.2, 12.4), 1);
  });

  const zoneLossWeights = zoneLossPcts.map((pct) => pct * between(random, 0.8, 1.2));

  const lossesByZone: EnergyZoneLoss[] = ZONES.map((zone, index) => ({
    zone: zone.zone,
    lossesKwh: Math.round(
      (nonTechnicalLossesKwh * (zoneLossWeights[index] ?? 0)) /
        zoneLossWeights.reduce((sum, weight) => sum + weight, 0),
    ),
    lossesPct: zoneLossPcts[index] ?? 0,
  })).sort((a, b) => b.lossesPct - a.lossesPct);

  const segmentValues = distribute(
    totalClients,
    SEGMENTS.map((segment) => segment.share * between(random, 0.96, 1.04)),
  );

  const clientsBySegment: EnergyClientSegment[] = SEGMENTS.map(
    (segment, index) => ({
      label: segment.label,
      value: segmentValues[index] ?? 0,
    }),
  );

  const criticalZoneClients = distribute(
    totalClients,
    ZONES.map(() => between(random, 0.8, 1.2)),
  );
  const criticalZoneConsumption = distribute(
    totalConsumptionKwh,
    ZONES.map(() => between(random, 0.7, 1.3)),
  );
  const criticalZoneLosses = distribute(
    nonTechnicalLossesKwh,
    zoneLossPcts.map((pct) => pct * between(random, 0.9, 1.1)),
  );

  const criticalZones: EnergyCriticalZone[] = ZONES.map((zone, index) => {
    const lossesPct = zoneLossPcts[index] ?? 0;
    return {
      id: `zone-${index + 1}`,
      zone: `Circuito ${zone.zone}`,
      municipality: zone.municipality,
      clients: criticalZoneClients[index] ?? 0,
      consumptionKwh: criticalZoneConsumption[index] ?? 0,
      lossesKwh: criticalZoneLosses[index] ?? 0,
      lossesPct,
      status: statusFor(lossesPct),
    };
  }).sort((a, b) => b.lossesPct - a.lossesPct);

  return {
    meta: {
      fileName: file.name,
      processedAt: new Date().toISOString(),
      rowsProcessed: totalClients,
      periodFrom: '2025-01-01',
      periodTo: '2025-12-31',
      source: 'mock',
    },
    kpis: {
      totalClients,
      totalConsumptionKwh,
      totalBilledCop,
      nonTechnicalLossesKwh,
      nonTechnicalLossesPct,
      detectedAnomalies,
      averageConsumptionKwh,
    },
    consumptionByPeriod,
    lossesByZone,
    clientsBySegment,
    lossTrend,
    criticalZones,
  };
}

export function createMockEnergyDashboard(file: File): Promise<EnergyDashboard> {
  const dashboard = buildMockEnergyDashboard(file);
  const delay = 900 + Math.round((file.size % 500) + Math.random() * 300);
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(dashboard), delay);
  });
}
