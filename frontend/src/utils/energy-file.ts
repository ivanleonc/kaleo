import { validateFile } from '@/utils/file';

export const ENERGY_FILE_ACCEPT = '.xlsx,.xls';

export const ENERGY_MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validateEnergyFile(file: File): string | null {
  return validateFile(file, {
    accept: ENERGY_FILE_ACCEPT,
    maxSize: ENERGY_MAX_FILE_SIZE,
    invalidTypeMessage: 'Selecciona un archivo de Excel con extensión .xlsx o .xls.',
    emptyMessage: 'El archivo está vacío. Verifica el contenido e inténtalo de nuevo.',
    maxSizeMessage: 'El archivo supera el límite de 10 MB.',
  });
}
