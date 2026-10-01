import { describe, it, expect } from 'vitest';
import { decodeAuditCursor, encodeAuditCursor } from './audit-cursor.js';

describe('encodeAuditCursor', () => {
  it('codifica created_at e id en base64url', () => {
    const cursor = encodeAuditCursor({
      created_at: '2026-01-15T10:30:00.000Z',
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    });

    expect(cursor).toBe(Buffer.from('2026-01-15T10:30:00.000Z|a1b2c3d4-e5f6-7890-abcd-ef1234567890').toString('base64url'));
  });

  it('normaliza Dates a ISO, igual que pg los devuelve', () => {
    const cursor = encodeAuditCursor({
      created_at: new Date('2026-01-15T10:30:00.000Z'),
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    });

    expect(decodeAuditCursor(cursor)).toEqual({
      createdAt: '2026-01-15T10:30:00.000Z',
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    });
  });

  it('no produce caracteres fuera del alfabeto base64url', () => {
    const cursor = encodeAuditCursor({
      created_at: '2026-01-15T10:30:00.000Z',
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    });

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+={0,2}$/);
  });
});

describe('decodeAuditCursor', () => {
  it('revierte lo que codifica encodeAuditCursor', () => {
    const original = {
      created_at: '2026-06-01T08:15:45.123Z',
      id: 'ffffffff-0000-4000-8000-000000000000',
    };

    expect(decodeAuditCursor(encodeAuditCursor(original))).toEqual({
      createdAt: original.created_at,
      id: original.id,
    });
  });

  it('conserva el id cuando created_at contiene el separador', () => {
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const cursor = Buffer.from(`2026-01-15T10:30:00.000Z|${id}`).toString('base64url');

    expect(decodeAuditCursor(cursor)).toEqual({ createdAt: '2026-01-15T10:30:00.000Z', id });
  });

  it('devuelve null si falta el separador', () => {
    const cursor = Buffer.from('2026-01-15T10:30:00.000Z').toString('base64url');

    expect(decodeAuditCursor(cursor)).toBeNull();
  });

  it('devuelve null si falta el id', () => {
    const cursor = Buffer.from('2026-01-15T10:30:00.000Z|').toString('base64url');

    expect(decodeAuditCursor(cursor)).toBeNull();
  });

  it('devuelve null si created_at no es una fecha válida', () => {
    const cursor = Buffer.from('no-es-fecha|a1b2c3d4-e5f6-7890-abcd-ef1234567890').toString('base64url');

    expect(decodeAuditCursor(cursor)).toBeNull();
  });

  it('devuelve null ante basura con forma de base64', () => {
    expect(decodeAuditCursor('!!!!')).toBeNull();
  });
});
