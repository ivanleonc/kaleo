import { describe, it, expect } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { CompanyAccessGuard } from './company-access.guard.js';
import { PermissionsGuard } from './permissions.guard.js';

function httpContext(request: Record<string, any>): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('CompanyAccessGuard', () => {
  const guard = new CompanyAccessGuard();

  it('deja pasar rutas públicas sin usuario', () => {
    const request: any = { headers: { 'x-company-id': 'empresa-b' } };
    expect(guard.canActivate(httpContext(request))).toBe(true);
  });

  it('deja pasar cuando no viene x-company-id', () => {
    const request: any = { user: { companies: ['empresa-a'] }, headers: {} };
    expect(guard.canActivate(httpContext(request))).toBe(true);
  });

  it('deja pasar cuando el usuario pertenece a la empresa y expone request.companyId', () => {
    const request: any = {
      user: { companies: ['empresa-a'] },
      headers: { 'x-company-id': 'empresa-a' },
    };
    expect(guard.canActivate(httpContext(request))).toBe(true);
    expect(request.companyId).toBe('empresa-a');
  });

  it('bloquea cuando el usuario NO pertenece a la empresa del header', () => {
    const request: any = {
      user: { companies: ['empresa-a'] },
      headers: { 'x-company-id': 'empresa-b' },
    };
    expect(() => guard.canActivate(httpContext(request))).toThrow(ForbiddenException);
  });
});

describe('PermissionsGuard (scoped a la empresa)', () => {
  const reflector = {
    getAllAndOverride: () => ['users:read'],
  } as any;
  const guard = new PermissionsGuard(reflector);

  const user = {
    roles: ['Owner'],
    permissions: ['users:read'],
    companyRoles: { 'empresa-a': ['Owner'], 'empresa-b': ['Viewer'] },
    companyPermissions: { 'empresa-a': ['users:read'], 'empresa-b': [] },
  };

  it('permite si la empresa del header tiene el permiso', () => {
    const request: any = { user, headers: { 'x-company-id': 'empresa-a' } };
    expect(guard.canActivate(httpContext(request))).toBe(true);
  });

  it('niega si el permiso solo existe en la primera empresa del token', () => {
    const request: any = { user, headers: { 'x-company-id': 'empresa-b' } };
    expect(() => guard.canActivate(httpContext(request))).toThrow(ForbiddenException);
  });

  it('sin header mantiene el fallback a los permisos por defecto', () => {
    const request: any = { user, headers: {} };
    expect(guard.canActivate(httpContext(request))).toBe(true);
  });
});
