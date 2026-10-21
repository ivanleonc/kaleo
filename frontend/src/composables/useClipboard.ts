import { useToast } from './useToast';

function copyWithFallback(text: string): boolean {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);

  try {
    field.select();
    return document.execCommand('copy');
  } finally {
    field.remove();
  }
}

/**
 * Copia texto al portapapeles con fallback para contextos sin HTTPS
 * (el portapapeles no está disponible en http:// en algunos navegadores).
 *
 * @param successMessage si se omite, no se muestra toast
 */
export function useClipboard() {
  const toast = useToast();

  const copyToClipboard = async (text: string, successMessage?: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (!copyWithFallback(text)) {
        throw new Error('No se pudo copiar');
      }

      if (successMessage) toast.success(successMessage);
      return true;
    } catch {
      toast.error('No se pudo copiar al portapapeles');
      return false;
    }
  };

  return { copyToClipboard };
}
