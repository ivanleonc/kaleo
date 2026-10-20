import { describe, expect, it } from 'vitest';
import { formatDate } from '@/utils/date';

describe('formatDate', () => {
  it('interpreta las fechas sin hora en horario local', () => {
    expect(formatDate('2025-01-01')).toBe('01 ene 2025');
    expect(formatDate('2025-12-31')).toBe('31 dic 2025');
  });

  it('mantiene las fechas con hora en su zona', () => {
    expect(formatDate('2025-12-31T12:00:00.000Z', 'America/Bogota')).toBe('31 dic 2025');
  });

  it('devuelve un guion para fechas inválidas', () => {
    expect(formatDate('no-es-fecha')).toBe('—');
  });
});
