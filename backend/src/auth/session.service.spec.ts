import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { SessionService } from './session.service.js';

/**
 * El reuso de un refresh token ya rotado debe revocar la familia completa.
 * Es la defensa contra una cadena de tokens robada.
 */
describe('SessionService.refresh', () => {
  function createService(overrides: { findByHash: any; revokeFamily: any }) {
    const jwtService = {
      verify: vi.fn(() => ({ sub: 'user-1', type: 'refresh' })),
    };
    const refreshTokenRepository = {
      findByHash: overrides.findByHash,
      revokeFamily: overrides.revokeFamily,
    };

    return new SessionService(
      {} as any,
      jwtService as any,
      {} as any,
      refreshTokenRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  }

  it('revoca la familia cuando el token ya fue rotado', async () => {
    const revokeFamily = vi.fn(async () => {});
    const service = createService({
      findByHash: vi.fn(async () => ({
        id: 'rt-1',
        user_id: 'user-1',
        expires_at: new Date(Date.now() + 60_000),
        revoked: true,
        family_id: 'family-1',
      })),
      revokeFamily,
    });

    await expect(service.refresh('token-viejo')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(revokeFamily).toHaveBeenCalledWith('family-1');
  });

  it('rechaza un token que no existe sin tocar la familia', async () => {
    const revokeFamily = vi.fn(async () => {});
    const service = createService({
      findByHash: vi.fn(async () => undefined),
      revokeFamily,
    });

    await expect(service.refresh('token-inexistente')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(revokeFamily).not.toHaveBeenCalled();
  });

  it('rechaza un token expirado', async () => {
    const revokeFamily = vi.fn(async () => {});
    const service = createService({
      findByHash: vi.fn(async () => ({
        id: 'rt-1',
        user_id: 'user-1',
        expires_at: new Date(Date.now() - 1000),
        revoked: false,
        family_id: 'family-1',
      })),
      revokeFamily,
    });

    await expect(service.refresh('token-expirado')).rejects.toThrow('expirado');
    expect(revokeFamily).not.toHaveBeenCalled();
  });
});
