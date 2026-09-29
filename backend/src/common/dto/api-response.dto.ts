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
