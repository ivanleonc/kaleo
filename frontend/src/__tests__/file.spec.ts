import { describe, expect, it } from 'vitest';
import { validateFile } from '@/utils/file';
import { validateEnergyFile } from '@/utils/energy-file';

function createFile(name: string, size = 10, type = ''): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('validateFile', () => {
  it('acepta extensiones permitidas sin distinguir mayúsculas', () => {
    expect(validateFile(createFile('DATOS.XLSX'), { accept: '.xlsx,.xls' })).toBeNull();
    expect(validateFile(createFile('datos.xls'), { accept: '.xlsx,.xls' })).toBeNull();
  });

  it('rechaza extensiones no permitidas', () => {
    expect(validateFile(createFile('datos.csv'), { accept: '.xlsx,.xls' })).toBe(
      'Selecciona un archivo con un formato permitido.',
    );
  });

  it('acepta tipos MIME y comodines', () => {
    expect(validateFile(createFile('foto.png', 10, 'image/png'), { accept: 'image/*' })).toBeNull();
    expect(validateFile(createFile('foto.png', 10, 'image/png'), { accept: 'application/pdf' })).not.toBeNull();
  });

  it('rechaza archivos vacíos y demasiado grandes', () => {
    expect(validateFile(createFile('vacio.xlsx', 0), { accept: '.xlsx' })).toContain('vacío');
    expect(validateFile(createFile('grande.xlsx', 2048), { maxSize: 1024 })).toContain(
      'supera el límite',
    );
  });

  it('mantiene los mensajes del validador de energía', () => {
    expect(validateEnergyFile(createFile('datos.pdf'))).toBe(
      'Selecciona un archivo de Excel con extensión .xlsx o .xls.',
    );
    expect(validateEnergyFile(createFile('datos.xlsx', 11 * 1024 * 1024))).toBe(
      'El archivo supera el límite de 10 MB.',
    );
  });
});
