export const EXPORT_FORMATS = ['csv', 'xlsx'] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/**
 * Límite de filas por exportación. Protege la memoria del proceso y evita
 * que un usuario sin filtros bloquee la base de datos durante demasiado
 * tiempo. Si el resultado lo supera, el servicio responde 413 y pide
 * refinar los filtros.
 */
export const EXPORT_MAX_ROWS = 10_000;

export type ExportValue = string | number | boolean | Date | null | undefined;

export interface ExportColumn<T> {
  /** Id de columna del frontend. Es el contrato para `columns=...`. */
  id: string;
  header: string;
  width?: number;
  numFmt?: string;
  value: (row: T) => ExportValue;
}

export interface ExportFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
