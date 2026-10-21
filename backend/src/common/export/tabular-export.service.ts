import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  StreamableFile,
} from '@nestjs/common';
import {
  EXPORT_CONTENT_TYPES,
  EXPORT_MAX_ROWS,
  type ExportColumn,
  type ExportFile,
  type ExportFormat,
  type ExportValue,
} from './export.types.js';

interface GenerateOptions {
  /** Nombre base sin extensión. Se sanitiza antes de usarlo. */
  filename: string;
  sheetName?: string;
}

type ExcelJs = typeof import('exceljs');

/**
 * ExcelJS es pesado (varios MB de JS) y solo hace falta al exportar a XLSX:
 * se carga bajo demanda para no penalizar el arranque de la API ni los tests.
 * El paquete es CommonJS, así que en ESM llega en `default`.
 */
async function loadExcelJs(): Promise<ExcelJs> {
  const loaded = (await import('exceljs')) as unknown as ExcelJs & {
    default?: ExcelJs;
  };

  return loaded.default ?? loaded;
}

export function exportFileToStreamable(file: ExportFile): StreamableFile {
  return new StreamableFile(file.buffer, {
    type: file.contentType,
    disposition: `attachment; filename="${file.filename}"`,
  });
}

@Injectable()
export class TabularExportService {
  /**
   * Filtra las columnas disponibles por los ids solicitados. El cliente solo
   * puede elegir columnas del whitelist del dominio; ids desconocidos se
   * ignoran. Si ninguno coincide, es un error de la petición.
   */
  resolveColumns<T>(
    available: ExportColumn<T>[],
    requested?: string[],
  ): ExportColumn<T>[] {
    if (!requested || requested.length === 0) return available;

    const wanted = new Set(requested.map((id) => id.trim()).filter(Boolean));
    const selected = available.filter((column) => wanted.has(column.id));

    if (selected.length === 0) {
      throw new BadRequestException('No hay columnas válidas para exportar');
    }

    return selected;
  }

  async generate<T>(
    format: ExportFormat,
    columns: ExportColumn<T>[],
    rows: T[],
    options: GenerateOptions,
  ): Promise<ExportFile> {
    if (rows.length > EXPORT_MAX_ROWS) {
      throw new PayloadTooLargeException(
        `La exportación supera el límite de ${EXPORT_MAX_ROWS.toLocaleString('es-CO')} filas. Aplica filtros para reducir el resultado.`,
      );
    }

    if (columns.length === 0) {
      throw new BadRequestException('No hay columnas para exportar');
    }

    const filename = this.filename(options.filename, format);
    const buffer =
      format === 'xlsx'
        ? await this.xlsx(columns, rows, options.sheetName ?? 'Datos')
        : this.csv(columns, rows);

    return {
      buffer,
      filename,
      contentType: EXPORT_CONTENT_TYPES[format],
    };
  }

  toStreamableFile(file: ExportFile): StreamableFile {
    return exportFileToStreamable(file);
  }

  private csv<T>(columns: ExportColumn<T>[], rows: T[]): Buffer {
    const lines = [
      columns.map((column) => this.csvCell(column.header)).join(','),
      ...rows.map((row) =>
        columns.map((column) => this.csvCell(column.value(row))).join(','),
      ),
    ];

    return Buffer.from(`\uFEFF${lines.join('\r\n')}`, 'utf-8');
  }

  private async xlsx<T>(
    columns: ExportColumn<T>[],
    rows: T[],
    sheetName: string,
  ): Promise<Buffer> {
    const workbook = new (await loadExcelJs()).Workbook();
    workbook.creator = 'Kaleo';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(this.sheetName(sheetName));
    worksheet.columns = columns.map((column) => ({
      header: column.header,
      key: column.id,
      width: column.width ?? 20,
      style: column.numFmt ? { numFmt: column.numFmt } : undefined,
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FF0F172A' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    headerRow.alignment = { vertical: 'middle' };

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, rows.length + 1), column: columns.length },
    };

    for (const row of rows) {
      const added = worksheet.addRow(columns.map((column) => column.value(row)));
      added.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: 'top', wrapText: true };
      });
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private csvCell(value: ExportValue): string {
    if (value === null || value === undefined) return '""';
    if (value instanceof Date) return this.quote(value.toISOString());

    const text = String(value);
    // Misma defensa que el CSV del frontend: evita que Excel interprete
    // contenido de usuario como una fórmula (=, +, -, @, tab o CR).
    const safe =
      typeof value === 'string' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

    return this.quote(safe);
  }

  private quote(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }

  private filename(base: string, format: ExportFormat): string {
    const safe = base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    return `${safe || 'exportacion'}.${format}`;
  }

  private sheetName(value: string): string {
    const safe = value.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31);
    return safe || 'Datos';
  }
}
