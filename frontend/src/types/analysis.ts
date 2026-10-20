import type { EnergyDashboard, EnergyKpis } from '@/types/energy';

export const ANALYSIS_TYPES = ['energy'] as const;

export type AnalysisType = (typeof ANALYSIS_TYPES)[number];

export const ANALYSIS_TYPE_LABELS: Record<string, string> = {
  energy: 'Energía',
};

export type AnalysisSource = 'api' | 'mock';

export interface EnergyAnalysisSummary extends Record<string, unknown> {
  periodFrom: string;
  periodTo: string;
  rowsProcessed: number;
  kpis: EnergyKpis;
}

export type AnalysisSummary = EnergyAnalysisSummary | Record<string, unknown>;

export interface Analysis {
  id: string;
  company_id: string;
  created_by: string | null;
  created_by_name: string | null;
  name: string;
  analysis_type: AnalysisType | string;
  source: AnalysisSource | string | null;
  file_name: string | null;
  file_size: number | null;
  summary: AnalysisSummary;
  created_at: string;
  updated_at: string;
}

export interface AnalysisDetail extends Analysis {
  result: EnergyDashboard | Record<string, unknown>;
}

export interface CreateAnalysisPayload {
  name: string;
  analysis_type: AnalysisType;
  file_name: string;
  file_size: number;
  result: Record<string, unknown>;
}

export interface RenameAnalysisPayload {
  name: string;
}

export interface AnalysesResponse {
  success: boolean;
  data: Analysis[];
  total: number;
  page: number;
  limit: number;
}

export interface AnalysisResponse {
  success: boolean;
  message?: string;
  data: Analysis;
}

export interface AnalysisDetailResponse {
  success: boolean;
  message?: string;
  data: AnalysisDetail;
}

export function analysisTypeLabel(type: string): string {
  return ANALYSIS_TYPE_LABELS[type] ?? type;
}

export function energySummaryOf(summary: AnalysisSummary): EnergyAnalysisSummary | null {
  const candidate = summary as Partial<EnergyAnalysisSummary>;
  if (
    candidate &&
    typeof candidate === 'object' &&
    typeof candidate.rowsProcessed === 'number' &&
    candidate.kpis &&
    typeof candidate.kpis === 'object'
  ) {
    return candidate as EnergyAnalysisSummary;
  }
  return null;
}

export function isEnergyResult(value: unknown): value is EnergyDashboard {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EnergyDashboard>;
  return (
    typeof candidate.meta === 'object' &&
    candidate.meta !== null &&
    typeof candidate.kpis === 'object' &&
    candidate.kpis !== null &&
    Array.isArray(candidate.criticalZones)
  );
}
