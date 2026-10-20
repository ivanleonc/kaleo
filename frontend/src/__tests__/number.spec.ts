import { describe, expect, it } from 'vitest';
import {
  formatCop,
  formatCopCompact,
  formatEnergyKwh,
  formatFileSize,
  formatInteger,
  formatPercent,
} from '@/utils/number';

describe('formatEnergyKwh', () => {
  it('escala de kWh a MWh, GWh y TWh', () => {
    expect(formatEnergyKwh(640)).toBe('640 kWh');
    expect(formatEnergyKwh(64_000)).toBe('64,0 MWh');
    expect(formatEnergyKwh(111_100_000)).toBe('111,1 GWh');
    expect(formatEnergyKwh(2_500_000_000)).toBe('2,5 TWh');
  });
});

describe('formatos numéricos', () => {
  it('formatea enteros y porcentajes en es-CO', () => {
    expect(formatInteger(479000)).toBe('479.000');
    expect(formatPercent(8.75)).toBe('8,8 %');
    expect(formatPercent(8.75, 2)).toBe('8,75 %');
  });

  it('formatea moneda y tamaños de archivo', () => {
    expect(formatCop(1500000)).toContain('1.500.000');
    expect(formatCopCompact(51_300_000_000)).toContain('51,3');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2,0 KB');
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2,0 MB');
  });
});
