import { describe, it, expect } from 'vitest';
import { buildDynamicUpdate, buildWhere } from './sql.helper.js';

describe('buildWhere', () => {
  it('concatena condiciones con placeholders correlativos', () => {
    const { where, values, nextIndex } = buildWhere([
      { clause: 'a = $?', value: 1 },
      { clause: 'b = $?', value: 2 },
    ]);

    expect(where).toBe('a = $1 AND b = $2');
    expect(values).toEqual([1, 2]);
    expect(nextIndex).toBe(3);
  });

  it('ignora condiciones falsas', () => {
    const { where, values } = buildWhere([
      { clause: 'a = $?', value: 1 },
      undefined,
      false,
      null,
      { clause: 'b = $?', value: 2 },
    ]);

    expect(where).toBe('a = $1 AND b = $2');
    expect(values).toEqual([1, 2]);
  });

  it('no consume parámetros en cláusulas estáticas', () => {
    const { where, values, nextIndex } = buildWhere([
      { clause: 'deleted_at IS NULL' },
      { clause: 'b = $?', value: 2 },
    ]);

    expect(where).toBe('deleted_at IS NULL AND b = $1');
    expect(values).toEqual([2]);
    expect(nextIndex).toBe(2);
  });

  it('reutiliza el mismo placeholder cuando reuse es true', () => {
    const { where, values } = buildWhere([
      { clause: '(name ILIKE $? OR email ILIKE $?)', value: '%juan%', reuse: true },
    ]);

    expect(where).toBe('(name ILIKE $1 OR email ILIKE $1)');
    expect(values).toEqual(['%juan%']);
  });

  it('respeta startIndex', () => {
    const { where, values } = buildWhere([{ clause: 'a = $?', value: 9 }], 3);

    expect(where).toBe('a = $3');
    expect(values).toEqual([9]);
  });

  it('devuelve where vacío sin condiciones', () => {
    expect(buildWhere([]).where).toBe('');
  });
});

describe('buildDynamicUpdate', () => {
  it('solo incluye campos definidos', () => {
    const { updates, values, startIndex } = buildDynamicUpdate(
      { name: 'Ana', email: undefined },
      ['name', 'email', 'phone'],
    );

    expect(updates).toEqual(['name = $1']);
    expect(values).toEqual(['Ana']);
    expect(startIndex).toBe(2);
  });

  it('convierte string vacío en null', () => {
    const { updates, values } = buildDynamicUpdate(
      { description: '', color: '#ffffff' },
      ['description', 'color'],
      { nullEmptyStrings: ['description'] },
    );

    expect(updates).toEqual(['description = $1', 'color = $2']);
    expect(values).toEqual([null, '#ffffff']);
  });

  it('aplica nullEmptyStrings a todos los campos', () => {
    const { values } = buildDynamicUpdate({ a: '', b: 'x' }, ['a', 'b'], { nullEmptyStrings: true });
    expect(values).toEqual([null, 'x']);
  });

  it('agrega extraSet sin consumir placeholders', () => {
    const { updates, values, startIndex } = buildDynamicUpdate(
      { name: 'Ana' },
      ['name'],
      { extraSet: ['updated_at = NOW()'] },
    );

    expect(updates).toEqual(['name = $1', 'updated_at = NOW()']);
    expect(values).toEqual(['Ana']);
    expect(startIndex).toBe(2);
  });

  it('devuelve SET vacío cuando no hay campos', () => {
    const { updates, startIndex } = buildDynamicUpdate({}, ['name', 'email']);
    expect(updates).toEqual([]);
    expect(startIndex).toBe(1);
  });
});
