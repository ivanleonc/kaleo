import type { ExportColumn } from '../common/export/export.types.js';
import type { AnalysisRow } from '../common/types/db-rows.js';
import {
  ANALYSIS_TYPE_LABELS,
  type AnalysisType,
  type EnergyCriticalZone,
  type EnergyZoneStatus,
} from './types/analysis.types.js';

const integerFormatter = new Intl.NumberFormat('es-CO');
const decimalFormatter = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 2,
});

function summaryText(summary: Record<string, unknown>): string {
  const rowsProcessed =
    typeof summary.rowsProcessed === 'number' ? summary.rowsProcessed : null;
  const kpis =
    summary.kpis && typeof summary.kpis === 'object'
      ? (summary.kpis as Record<string, unknown>)
      : null;
  const losses =
    kpis && typeof kpis.nonTechnicalLossesPct === 'number'
      ? kpis.nonTechnicalLossesPct
      : null;
  const periodFrom =
    typeof summary.periodFrom === 'string' ? summary.periodFrom : null;
  const periodTo = typeof summary.periodTo === 'string' ? summary.periodTo : null;

  const parts = [
    rowsProcessed !== null
      ? `${integerFormatter.format(rowsProcessed)} registros`
      : null,
    losses !== null
      ? `${decimalFormatter.format(losses)}% pérdidas`
      : null,
    periodFrom && periodTo ? `${periodFrom} a ${periodTo}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : 'Sin resumen';
}

export const ANALYSIS_EXPORT_COLUMNS: ExportColumn<AnalysisRow>[] = [
  {
    id: 'name',
    header: 'Análisis',
    width: 32,
    value: (row) => row.name,
  },
  {
    id: 'analysis_type',
    header: 'Tipo',
    width: 16,
    value: (row) =>
      ANALYSIS_TYPE_LABELS[row.analysis_type as AnalysisType] ?? row.analysis_type,
  },
  {
    id: 'summary',
    header: 'Resumen',
    width: 48,
    value: (row) => summaryText(row.summary ?? {}),
  },
  {
    id: 'created_at',
    header: 'Creado',
    width: 34,
    value: (row) => {
      const date = new Date(row.created_at).toISOString();
      return row.created_by_name ? `${date} (${row.created_by_name})` : date;
    },
  },
];

const ZONE_STATUS_LABELS: Record<EnergyZoneStatus, string> = {
  critical: 'Crítica',
  warning: 'En observación',
  normal: 'Normal',
};

export const CRITICAL_ZONE_EXPORT_COLUMNS: ExportColumn<EnergyCriticalZone>[] = [
  { id: 'zone', header: 'Zona', width: 28, value: (row) => row.zone },
  { id: 'municipality', header: 'Municipio', width: 24, value: (row) => row.municipality },
  { id: 'clients', header: 'Clientes', width: 14, value: (row) => row.clients },
  {
    id: 'consumption',
    header: 'Consumo (kWh)',
    width: 18,
    value: (row) => row.consumptionKwh,
    numFmt: '#,##0.00',
  },
  {
    id: 'losses',
    header: 'Pérdidas (kWh)',
    width: 18,
    value: (row) => row.lossesKwh,
    numFmt: '#,##0.00',
  },
  {
    id: 'losses_pct',
    header: '% Pérdida',
    width: 14,
    value: (row) => row.lossesPct,
    numFmt: '0.00"%"',
  },
  {
    id: 'status',
    header: 'Estado',
    width: 18,
    value: (row) => ZONE_STATUS_LABELS[row.status] ?? row.status,
  },
];
