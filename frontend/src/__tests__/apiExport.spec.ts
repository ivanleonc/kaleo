import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { fetchExportFile, filenameFromDisposition } from '@/api/export';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('@/api/axios', () => ({
  apiClient: { get: mockGet },
}));

describe('filenameFromDisposition', () => {
  it('lee el nombre entre comillas', () => {
    expect(
      filenameFromDisposition('attachment; filename="miembros_2026-01-01.csv"', 'x'),
    ).toBe('miembros_2026-01-01.csv');
  });

  it('decodifica el nombre codificado (filename*)', () => {
    expect(
      filenameFromDisposition(
        "attachment; filename*=UTF-8''an%C3%A1lisis.csv",
        'x',
      ),
    ).toBe('análisis.csv');
  });

  it('usa el fallback cuando no hay header', () => {
    expect(filenameFromDisposition(undefined, 'fallback.csv')).toBe('fallback.csv');
  });
});

describe('fetchExportFile', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('devuelve el blob y el nombre del backend', async () => {
    const blob = new Blob(['a,b'], { type: 'text/csv' });
    mockGet.mockResolvedValue({
      data: blob,
      headers: { 'content-disposition': 'attachment; filename="datos.csv"' },
    });

    const file = await fetchExportFile('/companies/users/export', { format: 'csv' });

    expect(file.blob).toBe(blob);
    expect(file.filename).toBe('datos.csv');
    expect(mockGet).toHaveBeenCalledWith('/companies/users/export', {
      params: { format: 'csv' },
      responseType: 'blob',
    });
  });

  it('convierte un error JSON (que llega como Blob) en Error con mensaje', async () => {
    const payload = new Blob(
      [JSON.stringify({ message: 'La exportación supera el límite de 10.000 filas.' })],
      { type: 'application/json' },
    );
    const error = new axios.AxiosError('Request failed');
    (error as any).response = { status: 413, data: payload };
    mockGet.mockRejectedValue(error);

    await expect(fetchExportFile('/companies/users/export')).rejects.toThrow(
      'La exportación supera el límite de 10.000 filas.',
    );
  });
});
