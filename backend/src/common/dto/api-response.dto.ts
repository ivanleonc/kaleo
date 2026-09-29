export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  total?: number;
  page?: number;
  limit?: number;
}

/**
 * Constructor estándar de respuestas. Todos los controllers deben usarlo
 * en vez de armar `{ success: true, ...result }` a mano.
 */
export function Ok<T>(data?: T, message?: string): ApiResponse<T> {
  return { success: true, ...(message ? { message } : {}), ...(data !== undefined ? { data } : {}) };
}

export function OkPaged<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): ApiResponse<T[]> {
  return { success: true, data, total, page, limit };
}

export interface CursorApiResponse<T> {
  success: boolean;
  data: T[];
  /** Cursor para la página siguiente, o `null` si ya no hay más. */
  nextCursor: string | null;
  hasNext: boolean;
  limit: number;
}

/**
 * Respuesta paginada por cursor (keyset). A diferencia de `OkPaged` no incluye
 * `total`: obtener el total exigiría un `COUNT(*)` sobre todo el rango, que es
 * justo el coste que la paginación por cursor evita.
 */
export function OkCursor<T>(
  data: T[],
  nextCursor: string | null,
  hasNext: boolean,
  limit: number,
): CursorApiResponse<T> {
  return { success: true, data, nextCursor, hasNext, limit };
}
