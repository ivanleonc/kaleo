import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { CompanyAccessGuard } from './company-access.guard.js';
import { PermissionsGuard } from './permissions.guard.js';
import { SuperAdminGuard } from './super-admin.guard.js';

function httpContext(request: Record<string, any>): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

/** DataSource falso: solo responde a la query de is_super_admin. */
function dataSourceStub(isSuperAdmin: boolean) {
  return {
    query: vi.fn(async () => [{ is_super_admin: isSuperAdmin }]),
  } as any;
}

describe('CompanyAccessGuard', () => {
  const guard = new CompanyAccessGuard(dataSourceStub(false));

  it('deja pasar rutas públicas sin usuario', async () => {
    const request: any = { headers: { 'x-company-id': 'empresa-b' } };
    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
  });

  it('deja pasar cuando no viene x-company-id', async () => {
    const request: any = { user: { companies: ['empresa-a'] }, headers: {} };
    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
  });

  it('deja pasar cuando el usuario pertenece a la empresa y expone request.companyId', async () => {
    const request: any = {
      user: { companies: ['empresa-a'] },
      headers: { 'x-company-id': 'empresa-a' },
    };
    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(request.companyId).toBe('empresa-a');
  });

  it('bloquea cuando el usuario NO pertenece a la empresa del header', async () => {
    const request: any = {
      user: { companies: ['empresa-a'] },
      headers: { 'x-company-id': 'empresa-b' },
    };
    await expect(guard.canActivate(httpContext(request))).rejects.toThrow(ForbiddenException);
  });

  it('super-admin por claim accede a empresa ajena sin query extra y marca el flag', async () => {
    const ds = dataSourceStub(false);
    const superGuard = new CompanyAccessGuard(ds);
    const request: any = {
      user: { id: 'u-1', companies: ['empresa-a'], isSuperAdmin: true },
      headers: { 'x-company-id': 'empresa-b' },
    };
    await expect(superGuard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(request.isSuperAdmin).toBe(true);
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('super-admin por DB accede a empresa ajena aunque el claim venga stale', async () => {
    const superGuard = new CompanyAccessGuard(dataSourceStub(true));
    const request: any = {
      user: { id: 'u-1', companies: ['empresa-a'], isSuperAdmin: false },
      headers: { 'x-company-id': 'empresa-b' },
    };
    await expect(superGuard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(request.isSuperAdmin).toBe(true);
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

  it('super-admin global pasa cualquier permiso y marca el flag', () => {
    const request: any = {
      user: { ...user, isSuperAdmin: true },
      headers: { 'x-company-id': 'empresa-b' },
    };
    expect(guard.canActivate(httpContext(request))).toBe(true);
    expect(request.isSuperAdmin).toBe(true);
  });
});

describe('SuperAdminGuard', () => {
  it('permite por claim sin tocar la DB', async () => {
    const ds = dataSourceStub(false);
    const guard = new SuperAdminGuard(ds);
    const request: any = { user: { id: 'u-1', isSuperAdmin: true }, headers: {} };
    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(request.isSuperAdmin).toBe(true);
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('permite por DB aunque el claim venga stale', async () => {
    const guard = new SuperAdminGuard(dataSourceStub(true));
    const request: any = { user: { id: 'u-1' }, headers: {} };
    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(request.isSuperAdmin).toBe(true);
  });

  it('bloquea a usuarios normales', async () => {
    const guard = new SuperAdminGuard(dataSourceStub(false));
    const request: any = { user: { id: 'u-1' }, headers: {} };
    await expect(guard.canActivate(httpContext(request))).rejects.toThrow(ForbiddenException);
  });

  it('bloquea sin usuario autenticado', async () => {
    const guard = new SuperAdminGuard(dataSourceStub(true));
    const request: any = { headers: {} };
    await expect(guard.canActivate(httpContext(request))).rejects.toThrow(ForbiddenException);
  });
});
