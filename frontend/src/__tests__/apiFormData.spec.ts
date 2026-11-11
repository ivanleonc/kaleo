import { describe, expect, it } from 'vitest';
import type { AxiosRequestConfig } from 'axios';
import { apiClient } from '@/api/axios';

/**
 * Regresión: el default `Content-Type: application/json` hacía que Axios
 * transformara FormData a JSON antes de enviarlo. El backend recibía un body
 * sin `file` y respondía 400 "Falta el archivo" en documentos e importaciones.
 */
describe('apiClient con FormData', () => {
  it('envía el FormData sin convertirlo a JSON', async () => {
    const form = new FormData();
    form.append('file', new File(['hola'], 'sedes.csv', { type: 'text/csv' }));

    let captured: AxiosRequestConfig | undefined;

    await apiClient.post('/test-upload', form, {
      adapter: async (config) => {
        captured = config;
        return {
          data: { success: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      },
    });

    expect(captured?.data).toBeInstanceOf(FormData);
    const contentType = (captured?.headers as any)?.get?.('Content-Type')
      ?? (captured?.headers as any)?.['Content-Type'];
    expect(String(contentType ?? '')).not.toContain('application/json');
  });
});
