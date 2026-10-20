export const ANALYSIS_TYPES = ['energy'] as const;

export const MAX_ANALYSIS_FILE_BYTES = 10 * 1024 * 1024;

export type AnalysisType = (typeof ANALYSIS_TYPES)[number];

export const ANALYSIS_TYPE_LABELS: Record<AnalysisType, string> = {
  energy: 'Energía',
};

export type EnergySource = 'api' | 'mock';

export interface EnergyMeta {
  fileName: string;
  processedAt: string;
  rowsProcessed: number;
  periodFrom: string;
  periodTo: string;
  source: EnergySource;
}

export interface EnergyKpis {
  totalClients: number;
  totalConsumptionKwh: number;
  totalBilledCop: number;
  nonTechnicalLossesKwh: number;
  nonTechnicalLossesPct: number;
  detectedAnomalies: number;
  averageConsumptionKwh: number;
}

export interface EnergyConsumptionPoint {
  period: string;
  consumptionKwh: number;
  billedKwh: number;
}

export interface EnergyZoneLoss {
  zone: string;
  lossesKwh: number;
  lossesPct: number;
}

export interface EnergyClientSegment {
  label: string;
  value: number;
}

export interface EnergyLossPoint {
  period: string;
  lossesPct: number;
}

export type EnergyZoneStatus = 'critical' | 'warning' | 'normal';

export interface EnergyCriticalZone {
  id: string;
  zone: string;
  municipality: string;
  clients: number;
  consumptionKwh: number;
  lossesKwh: number;
  lossesPct: number;
  status: EnergyZoneStatus;
}

export interface EnergyAnalysisResult {
  meta: EnergyMeta;
  kpis: EnergyKpis;
  consumptionByPeriod: EnergyConsumptionPoint[];
  lossesByZone: EnergyZoneLoss[];
  clientsBySegment: EnergyClientSegment[];
  lossTrend: EnergyLossPoint[];
  criticalZones: EnergyCriticalZone[];
}

export interface EnergyAnalysisSummary extends Record<string, unknown> {
  periodFrom: string;
  periodTo: string;
  rowsProcessed: number;
  kpis: EnergyKpis;
}
