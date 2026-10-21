import type { ExportColumn } from '../common/export/export.types.js';

export interface AuditExportRow {
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  response_status: number | null;
  duration_ms: number | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

function parseUserAgent(ua?: string | null): string {
  if (!ua) return 'Desconocido';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Otro';
}

export const AUDIT_EXPORT_COLUMNS: ExportColumn<AuditExportRow>[] = [
  {
    id: 'created_at',
    header: 'Fecha',
    width: 24,
    value: (row) => new Date(row.created_at).toISOString(),
  },
  {
    id: 'user_name',
    header: 'Usuario',
    width: 24,
    value: (row) => row.user_name || 'N/A',
  },
  {
    id: 'user_email',
    header: 'Email',
    width: 30,
    value: (row) => row.user_email || 'N/A',
  },
  {
    id: 'action',
    header: 'Acción',
    width: 28,
    value: (row) => row.action,
  },
  {
    id: 'response_status',
    header: 'Estado',
    width: 12,
    value: (row) => row.response_status ?? '',
  },
  {
    id: 'duration_ms',
    header: 'Duración (ms)',
    width: 16,
    value: (row) => row.duration_ms ?? '',
  },
  {
    id: 'entity_type',
    header: 'Entidad',
    width: 18,
    value: (row) => row.entity_type,
  },
  {
    id: 'entity_id',
    header: 'ID Entidad',
    width: 38,
    value: (row) => row.entity_id,
  },
  {
    id: 'old_values',
    header: 'Valores Anteriores',
    width: 48,
    value: (row) => (row.old_values ? JSON.stringify(row.old_values) : ''),
  },
  {
    id: 'new_values',
    header: 'Valores Nuevos',
    width: 48,
    value: (row) => (row.new_values ? JSON.stringify(row.new_values) : ''),
  },
  {
    id: 'ip_address',
    header: 'IP',
    width: 20,
    value: (row) => row.ip_address || '',
  },
  {
    id: 'user_agent',
    header: 'Navegador',
    width: 16,
    value: (row) => parseUserAgent(row.user_agent),
  },
];
