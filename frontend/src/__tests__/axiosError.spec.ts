import { describe, it, expect } from 'vitest';
import { enrichAxiosError } from '@/api/axios';
import { apiErrorMessage } from '@/utils/error';

/**
 * Regresión: un 403 con mensaje específico del servidor (ej. reuso de
 * contraseña en /change-password) debe mostrar ESE mensaje, no el genérico
 * "No tienes permiso para realizar esta acción."
 */
describe('enrichAxiosError + apiErrorMessage (403)', () => {
  const resolveMessage = (responseData: unknown, status = 403): string => {
    const error: any = { response: { status, data: responseData } };
    enrichAxiosError(error);
    return apiErrorMessage(error, 'fallback');
  };

  it('muestra el mensaje específico del servidor cuando existe', () => {
    expect(
      resolveMessage({ message: 'No puedes usar una de las últimas 3 contraseñas.' }),
    ).toBe('No puedes usar una de las últimas 3 contraseñas.');
  });

  it('usa el genérico solo cuando el 403 viene sin explicación', () => {
    expect(resolveMessage({})).toBe('No tienes permiso para realizar esta acción.');
    expect(resolveMessage({ message: '   ' })).toBe(
      'No tienes permiso para realizar esta acción.',
    );
    expect(resolveMessage(null)).toBe('No tienes permiso para realizar esta acción.');
  });

  it('marca _isForbidden en cualquier 403', () => {
    const error: any = { response: { status: 403, data: {} } };
    enrichAxiosError(error);
    expect(error._isForbidden).toBe(true);
  });

  it('no toca errores que no son 403', () => {
    const error: any = { response: { status: 500, data: { message: 'Error interno' } } };
    enrichAxiosError(error);
    expect(error._isForbidden).toBeUndefined();
    expect(apiErrorMessage(error, 'fallback')).toBe('Error interno');
  });
});
