export type CsvValue = string | number | null | undefined;

export interface CsvOptions {
  bom?: boolean;
  delimiter?: string;
}

function escapeCsvCell(value: CsvValue): string {
  if (value === null || value === undefined) return '""';

  const text = String(value);
  const safe =
    typeof value === 'string' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

  return `"${safe.replace(/"/g, '""')}"`;
}

export function rowsToCsv(rows: CsvValue[][], options: CsvOptions = {}): string {
  const { bom = true, delimiter = ',' } = options;
  const body = rows
    .map((row) => row.map(escapeCsvCell).join(delimiter))
    .join('\r\n');

  return `${bom ? '\uFEFF' : ''}${body}`;
}

export function createCsvBlob(rows: CsvValue[][], options: CsvOptions = {}): Blob {
  return new Blob([rowsToCsv(rows, options)], {
    type: 'text/csv;charset=utf-8;',
  });
}

export function sanitizeFilename(value: string, fallback = 'archivo'): string {
  const filename = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return filename || fallback;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
