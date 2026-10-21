import { formatFileSize } from '@/utils/number';

export interface FileValidationOptions {
  accept?: string;
  maxSize?: number;
  invalidTypeMessage?: string;
  emptyMessage?: string;
  maxSizeMessage?: string;
}

function matchesAccept(file: File, accept: string): boolean {
  const tokens = accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) return true;

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return tokens.some((token) => {
    if (token === '*/*') return true;
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

export function validateFile(file: File, options: FileValidationOptions = {}): string | null {
  const {
    accept = '',
    maxSize,
    invalidTypeMessage = 'Selecciona un archivo con un formato permitido.',
    emptyMessage = 'El archivo está vacío. Verifica el contenido e inténtalo de nuevo.',
    maxSizeMessage,
  } = options;

  if (accept && !matchesAccept(file, accept)) {
    return invalidTypeMessage;
  }

  if (file.size === 0) {
    return emptyMessage;
  }

  if (maxSize !== undefined && file.size > maxSize) {
    return maxSizeMessage ?? `El archivo supera el límite de ${formatFileSize(maxSize)}.`;
  }

  return null;
}
