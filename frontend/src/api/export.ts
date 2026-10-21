import axios from 'axios';
import { apiClient } from './axios';

export type ExportFormat = 'csv' | 'xlsx';

export interface ExportedFile {
  blob: Blob;
  filename: string;
}

export function filenameFromDisposition(
  disposition: string | undefined,
  fallback: string,
): string {
  if (!disposition) return fallback;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      return encoded[1].trim();
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1]?.trim() || fallback;
}

async function throwExportError(error: unknown): Promise<never> {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    const text = await error.response.data.text();

    try {
      const parsed = JSON.parse(text) as { message?: unknown; error?: unknown };
      const message = Array.isArray(parsed.message)
        ? parsed.message.join(' ')
        : parsed.message ?? parsed.error;

      if (typeof message === 'string' && message.trim()) {
        throw new Error(message);
      }
    } catch (parseError) {
      if (parseError instanceof Error && !(parseError instanceof SyntaxError)) {
        throw parseError;
      }
    }
  }

  throw error;
}

/**
 * Descarga un archivo exportado y conserva el nombre enviado por el backend.
 * Los errores JSON del backend llegan como Blob cuando se usa `responseType:
 * 'blob'`; se convierten en `Error` para que la UI muestre el mensaje real
 * (por ejemplo, el 413 por superar el límite de filas).
 */
export async function fetchExportFile(
  url: string,
  params: Record<string, unknown> = {},
): Promise<ExportedFile> {
  try {
    const response = await apiClient.get<Blob>(url, {
      params,
      responseType: 'blob',
    });

    return {
      blob: response.data,
      filename: filenameFromDisposition(
        response.headers['content-disposition'],
        `exportacion_${new Date().toISOString().slice(0, 10)}`,
      ),
    };
  } catch (error) {
    return throwExportError(error);
  }
}
