import { describe, it, expect } from 'vitest';
import { slugify, slugWithSuffix, SLUG_MAX_LENGTH } from './slug.util.js';

describe('slugify', () => {
  it('normaliza nombre a slug en minúsculas', () => {
    expect(slugify('Mi Empresa S.A.')).toBe('mi-empresa-s-a');
  });

  it('quita acentos y diéresis', () => {
    expect(slugify('Compañía Aérea')).toBe('compania-aerea');
  });

  it('colapsa separadores repetidos y recorta guiones', () => {
    expect(slugify('  Hola---Mundo!! ')).toBe('hola-mundo');
  });

  it('usa fallback cuando no queda nada utilizable', () => {
    expect(slugify('')).toBe('empresa');
    expect(slugify('!!!')).toBe('empresa');
    expect(slugify(null)).toBe('empresa');
  });

  it('respeta el largo máximo y no termina en guión', () => {
    const result = slugify('a'.repeat(150));
    expect(result.length).toBe(SLUG_MAX_LENGTH);
    expect(result.endsWith('-')).toBe(false);
  });

  it('cumple el patrón aceptado por CreateCompanyDto', () => {
    expect(slugify('Árbol & Caña 2026')).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});

describe('slugWithSuffix', () => {
  it('agrega el sufijo numérico', () => {
    expect(slugWithSuffix('acme', 2)).toBe('acme-2');
  });

  it('mantiene el largo máximo al agregar sufijos largos', () => {
    const result = slugWithSuffix('a'.repeat(SLUG_MAX_LENGTH), 123456);
    expect(result.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(result).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});
