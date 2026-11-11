import { BadRequestException } from '@nestjs/common';

export const MAX_IMPORT_ROWS = 500;

type ExcelJs = typeof import('exceljs');

async function loadExcelJs(): Promise<ExcelJs> {
  const loaded = (await import('exceljs')) as unknown as ExcelJs & {
    default?: ExcelJs;
  };
  return loaded.default ?? loaded;
}

export interface UploadedTabularFile {
  buffer: Buffer;
  originalname: string;
}

/**
 * Convierte un CSV/XLSX en una matriz de celdas de texto. Misma estrategia que
 * `BranchImportParser`, pero genérica para reutilizar en otros imports.
 */
export async function parseTabularMatrix(file: UploadedTabularFile): Promise<string[][]> {
  const extension = file.originalname.toLowerCase().split('.').pop();
  if (!extension) throw new BadRequestException('El archivo no tiene extensión');

  if (extension === 'csv') {
    return parseDelimited(file.buffer.toString('utf-8'));
  }
  if (extension === 'xlsx') {
    return parseXlsx(file.buffer);
  }
  throw new BadRequestException('Formato no soportado: usa .csv o .xlsx');
}

/**
 * Mapea la primera fila como encabezados normalizados (sin acentos, en
 * minúscula y con guiones bajos) usando alias opcionales.
 */
export function mapRecords(
  matrix: string[][],
  aliases: Record<string, string>,
  required: string[],
): Record<string, string>[] {
  if (matrix.length === 0) throw new BadRequestException('El archivo está vacío');

  const headers = matrix[0]!.map((header) => aliases[normalizeHeader(header)] ?? '');
  for (const column of required) {
    if (!headers.includes(column)) {
      throw new BadRequestException(`Falta la columna requerida "${column}"`);
    }
  }

  const records: Record<string, string>[] = [];
  for (const row of matrix.slice(1)) {
    if (!row.some((cell) => cell.trim() !== '')) continue;
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const value = row[index]?.trim();
      if (value) record[header] = value;
    });
    if (Object.keys(record).length > 0) records.push(record);
  }

  if (records.length > MAX_IMPORT_ROWS) {
    throw new BadRequestException(`El archivo supera el máximo de ${MAX_IMPORT_ROWS} filas`);
  }
  return records;
}

export function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

export function parseNumeric(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  // Soporta "1.234,56" (es-CO) y "1234.56".
  const cleaned = value.replace(/\s/g, '');
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
}

function parseDelimited(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < clean.length; index++) {
    const char = clean[index]!;

    if (inQuotes) {
      if (char === '"') {
        if (clean[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[index + 1] === '\n') index++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((item) => item.some((cell) => cell.trim() !== ''));
}

async function parseXlsx(buffer: Buffer): Promise<string[][]> {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new BadRequestException('El XLSX no tiene hojas');

  const rows: string[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      cells[column - 1] = cell.text ?? '';
    });
    rows.push(cells);
  });
  return rows;
}
