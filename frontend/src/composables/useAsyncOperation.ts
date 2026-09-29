import { ref } from 'vue';
import { apiErrorMessage, hasApiError } from '@/utils/error';

interface UseAsyncOptions {
  errorMessage?: string;
  /** Si es false, el error se guarda pero no se relanza. */
  rethrow?: boolean;
}

/**
 * Estado de carga + error para una operación asíncrona.
 *
 * Reemplaza los `withLoading` duplicados en member/branch/company store y los
 * bloques manuales isLoading/try/finally de varias vistas.
 */
export function useAsyncOperation(options: UseAsyncOptions = {}) {
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const execute = async <T>(
    fn: () => Promise<T>,
    errorMessage?: string,
  ): Promise<T | undefined> => {
    isLoading.value = true;
    error.value = null;
    try {
      return await fn();
    } catch (err: unknown) {
      const fallback = errorMessage ?? options.errorMessage ?? 'Error en la operación';
      // Un fallback explícito gana sobre el mensaje genérico de axios
      // ("Network Error", "Request failed with status code 500"), que no
      // describe nada útil para el usuario final.
      error.value = hasApiError(err) ? apiErrorMessage(err, fallback) : fallback;
      if (options.rethrow !== false) throw err;
      return undefined;
    } finally {
      isLoading.value = false;
    }
  };

  const reset = () => {
    isLoading.value = false;
    error.value = null;
  };

  return { isLoading, error, execute, reset };
}
