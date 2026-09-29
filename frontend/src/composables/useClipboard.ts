import { useToast } from './useToast';

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
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
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
