import { describe, expect, it, vi } from 'vitest';
import {
  createCsvBlob,
  downloadBlob,
  rowsToCsv,
  sanitizeFilename,
} from '@/utils/csv';

describe('csv', () => {
  it('escapa comillas, comas y saltos de línea', () => {
    const csv = rowsToCsv(
      [['Nombre', 'Nota'], ['Ana "La Jefa"', 'uno, dos\ntres']],
      { bom: false },
    );

    expect(csv).toBe('"Nombre","Nota"\r\n"Ana ""La Jefa""","uno, dos\ntres"');
  });

  it('añade BOM por defecto y permite desactivarlo', () => {
    expect(rowsToCsv([['a']])).toBe('\uFEFF"a"');
    expect(rowsToCsv([['a']], { bom: false })).toBe('"a"');
  });

  it('neutraliza fórmulas solo en textos, sin tocar números negativos', () => {
    const csv = rowsToCsv(
      [['=SUM(A1)', '+1', '-texto', '@cmd', -5]],
      { bom: false },
    );

    expect(csv).toBe('"\'=SUM(A1)","\'+1","\'-texto","\'@cmd","-5"');
  });

  it('crea un Blob CSV con charset UTF-8', () => {
    const blob = createCsvBlob([['Zona', 'Pérdidas'], ['Norte', 4.5]]);

    expect(blob.type).toBe('text/csv;charset=utf-8;');
  });

  it('normaliza nombres de archivo', () => {
    expect(sanitizeFilename('Facturación Enero / 2026')).toBe('facturacion-enero-2026');
    expect(sanitizeFilename('***')).toBe('archivo');
  });

  it('descarga un Blob y revoca la URL', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => 'blob:demo');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });

    const click = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(click);

    downloadBlob(new Blob(['x']), 'datos.csv');

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:demo');

    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
