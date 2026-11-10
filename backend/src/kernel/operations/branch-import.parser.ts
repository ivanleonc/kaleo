import { BadRequestException, Injectable } from '@nestjs/common';

const MAX_IMPORT_ROWS = 500;

const HEADER_ALIASES: Record<string, string> = {
  name: 'name',
  nombre: 'name',
  address: 'address',
  direccion: 'address',
  city: 'city',
  ciudad: 'city',
  state: 'state',
  departamento: 'state',
  provincia: 'state',
  country: 'country',
  pais: 'country',
  postal_code: 'postal_code',
  codigo_postal: 'postal_code',
  cp: 'postal_code',
  phone: 'phone',
  telefono: 'phone',
  email: 'email',
  correo: 'email',
  code: 'code',
  codigo: 'code',
  timezone: 'timezone',
  zona_horaria: 'timezone',
};

@Injectable()
export class BranchImportParser {
  async parse(file: { buffer: Buffer; originalname: string }): Promise<Record<string, unknown>[]> {
    const extension = file.originalname.toLowerCase().split('.').pop();
    if (!extension) throw new BadRequestException('El archivo no tiene extensión');

    let matrix: string[][];
    if (extension === 'csv') {
      matrix = parseDelimited(file.buffer.toString('utf-8'));
    } else if (extension === 'xlsx') {
      matrix = await parseXlsx(file.buffer);
    } else {
      throw new BadRequestException('Formato no soportado: usa .csv o .xlsx');
    }

    return matrixToRecords(matrix);
  }
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

function matrixToRecords(matrix: string[][]): Record<string, unknown>[] {
  if (matrix.length === 0) throw new BadRequestException('El archivo está vacío');

  const headers = matrix[0]!.map((header) => HEADER_ALIASES[normalizeHeader(header)] ?? '');
  if (!headers.includes('name')) {
    throw new BadRequestException('Falta la columna "name" o "nombre"');
  }

  const records: Record<string, unknown>[] = [];
  for (const row of matrix.slice(1)) {
    if (!row.some((cell) => cell.trim() !== '')) continue;

    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const value = row[index]?.trim();
      if (value) record[header] = value;
    });
    if (Object.keys(record).length > 0) records.push(record);
  }

  if (records.length === 0) throw new BadRequestException('El archivo no contiene filas');
  if (records.length > MAX_IMPORT_ROWS) {
    throw new BadRequestException(`El archivo supera el máximo de ${MAX_IMPORT_ROWS} filas`);
  }

  return records;
}

function parseDelimited(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)
    ? ';'
    : ',';

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
  await workbook.xlsx.load(buffer as any);

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

async function loadExcelJs(): Promise<typeof import('exceljs')> {
  const loaded = (await import('exceljs')) as unknown as typeof import('exceljs') & {
    default?: typeof import('exceljs');
  };
  return loaded.default ?? loaded;
}
