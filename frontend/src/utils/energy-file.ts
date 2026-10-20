export const ENERGY_FILE_ACCEPT = '.xlsx,.xls';

export const ENERGY_MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

export function validateEnergyFile(file: File): string | null {
  const dotIndex = file.name.lastIndexOf('.');
  const extension = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return 'Selecciona un archivo de Excel con extensión .xlsx o .xls.';
  }

  if (file.size === 0) {
    return 'El archivo está vacío. Verifica el contenido e inténtalo de nuevo.';
  }

  if (file.size > ENERGY_MAX_FILE_SIZE) {
    return 'El archivo supera el límite de 10 MB.';
  }

  return null;
}
