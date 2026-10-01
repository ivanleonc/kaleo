/** Extracción y normalización de errores de API. */

/**
 * Extrae el mensaje de error de una respuesta de axios.
 *
 * El backend puede devolver `message` (excepciones de Nest) o `error`
 * (formato genérico). Antes cada vista elegía una u otra y en tres puntos de
 * ProfileView solo se leía `message`, perdiendo el error si venía `error`.
 */
export function apiErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error inesperado',
): string {
  if (typeof error === 'string' && error.trim()) return error;

  // Custom enriched messages set by the axios interceptor
  if ((error as any)?._userMessage) return (error as any)._userMessage;

  const data = (error as any)?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;

  const message = data?.message ?? data?.error;
  if (typeof message === 'string' && message.trim()) return message;

  if (Array.isArray(message) && message.length > 0) {
    return message.map((item: any) => item?.message ?? String(item)).join(' ');
  }

  // Friendly Spanish for raw axios "Network Error"
  if (error instanceof Error && error.message === 'Network Error') {
    return 'Sin conexión al servidor. Revisa tu internet.';
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
}

/**
 * Indica si el error proviene de la capa HTTP (tiene respuesta de axios).
 *
 * Permite decidir entre el mensaje del servidor y un texto de contexto propio:
 * `new Error('Respuesta inválida del servidor')` sí aporta información, pero
 * `Error: Network Error` no.
 */
export function hasApiError(error: unknown): boolean {
  const response = (error as any)?.response;
  if (response) return true;

  const code = (error as any)?.code;
  return code === 'ERR_NETWORK' || code === 'ECONNABORTED' || code === 'ETIMEDOUT';
}
