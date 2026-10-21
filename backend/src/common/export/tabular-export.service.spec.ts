import { describe, it, expect } from 'vitest';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { TabularExportService } from './tabular-export.service.js';
import type { ExportColumn } from './export.types.js';

interface Row {
  name: string;
  total: number;
}

const columns: ExportColumn<Row>[] = [
  { id: 'name', header: 'Nombre', value: (row) => row.name },
  { id: 'total', header: 'Total', value: (row) => row.total },
];

describe('TabularExportService', () => {
  const service = new TabularExportService();

  describe('resolveColumns', () => {
    it('devuelve todas las columnas cuando no se piden ids', () => {
      expect(service.resolveColumns(columns)).toHaveLength(2);
    });

    it('filtra por los ids solicitados', () => {
      const selected = service.resolveColumns(columns, ['name']);
      expect(selected.map((column) => column.id)).toEqual(['name']);
    });

    it('ignora ids desconocidos', () => {
      const selected = service.resolveColumns(columns, ['name', 'inexistente']);
      expect(selected.map((column) => column.id)).toEqual(['name']);
    });

    it('rechaza cuando ningún id coincide', () => {
      expect(() => service.resolveColumns(columns, ['inexistente'])).toThrow(
        BadRequestException,
      );
    });
  });

  describe('generate (CSV)', () => {
    it('genera CSV con BOM, cabecera y valores', async () => {
      const file = await service.generate('csv', columns, [
        { name: 'Ana', total: 3 },
        { name: 'Luis', total: 7 },
      ], { filename: 'prueba' });

      expect(file.filename).toBe('prueba.csv');
      expect(file.contentType).toContain('text/csv');

      const text = file.buffer.toString('utf-8');
      expect(text.startsWith('\uFEFF')).toBe(true);
      expect(text).toContain('"Nombre","Total"');
      expect(text).toContain('"Ana","3"');
    });

    it('neutraliza fórmulas en los valores', async () => {
      const file = await service.generate('csv', columns, [
        { name: '=SUM(A1)', total: 1 },
      ], { filename: 'prueba' });

      expect(file.buffer.toString('utf-8')).toContain("\"'=SUM(A1)\"");
    });
  });

  describe('generate (XLSX)', () => {
    it('genera un archivo zip (xlsx) con la extensión correcta', async () => {
      const file = await service.generate('xlsx', columns, [
        { name: 'Ana', total: 3 },
      ], { filename: 'prueba' });

      expect(file.filename).toBe('prueba.xlsx');
      expect(file.contentType).toContain('spreadsheetml');
      // La firma de un zip (que es lo que envuelve el xlsx).
      expect(file.buffer.subarray(0, 2).toString('utf-8')).toBe('PK');
    });
  });

  describe('límite de filas', () => {
    it('lanza 413 cuando el resultado supera el máximo', async () => {
      const rows = Array.from({ length: 10_001 }, (_, index) => ({
        name: `Fila ${index}`,
        total: index,
      }));

      await expect(
        service.generate('csv', columns, rows, { filename: 'grande' }),
      ).rejects.toBeInstanceOf(PayloadTooLargeException);
    });
  });
});
