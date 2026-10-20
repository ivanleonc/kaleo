export type EnergySource = 'api' | 'mock';

export type EnergyZoneStatus = 'critical' | 'warning' | 'normal';

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

export interface EnergyDashboard {
  meta: EnergyMeta;
  kpis: EnergyKpis;
  consumptionByPeriod: EnergyConsumptionPoint[];
  lossesByZone: EnergyZoneLoss[];
  clientsBySegment: EnergyClientSegment[];
  lossTrend: EnergyLossPoint[];
  criticalZones: EnergyCriticalZone[];
}

export interface EnergyMetaApi {
  file_name?: string;
  processed_at?: string;
  rows_processed?: number;
  period_from?: string;
  period_to?: string;
}

export interface EnergyKpisApi {
  total_clients?: number;
  total_consumption_kwh?: number;
  total_billed_cop?: number;
  non_technical_losses_kwh?: number;
  non_technical_losses_pct?: number;
  detected_anomalies?: number;
  average_consumption_kwh?: number;
}

export interface EnergyConsumptionPointApi {
  period?: string;
  consumption_kwh?: number;
  billed_kwh?: number;
}

export interface EnergyZoneLossApi {
  zone?: string;
  losses_kwh?: number;
  losses_pct?: number;
}

export interface EnergyClientSegmentApi {
  label?: string;
  value?: number;
}

export interface EnergyLossPointApi {
  period?: string;
  losses_pct?: number;
}

export interface EnergyCriticalZoneApi {
  id?: string;
  zone?: string;
  municipality?: string;
  clients?: number;
  consumption_kwh?: number;
  losses_kwh?: number;
  losses_pct?: number;
  status?: string;
}

export interface EnergyDashboardApi {
  meta?: EnergyMetaApi;
  kpis?: EnergyKpisApi;
  consumption_by_period?: EnergyConsumptionPointApi[];
  losses_by_zone?: EnergyZoneLossApi[];
  clients_by_segment?: EnergyClientSegmentApi[];
  loss_trend?: EnergyLossPointApi[];
  critical_zones?: EnergyCriticalZoneApi[];
}

export interface EnergyApiResponse {
  success?: boolean;
  message?: string;
  detail?: string;
  data?: EnergyDashboardApi;
}
