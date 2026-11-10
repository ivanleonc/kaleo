import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { CompanyAccessGuard } from './company-access.guard.js';
import { PermissionsGuard } from './permissions.guard.js';
import { SuperAdminGuard } from './super-admin.guard.js';
import { TenantContextService } from '../tenancy/tenant-context.service.js';

function httpContext(request: Record<string, any>): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

/** DataSource falso: responde a membership y a la query de is_super_admin. */
function dataSourceStub(
  isSuperAdmin: boolean,
  membership: { tokenVersion?: number } | null = { tokenVersion: 0 },
) {
  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes('FROM memberships')) {
        return membership ? [{ token_version: membership.tokenVersion ?? 0 }] : [];
      }
      return [{ is_super_admin: isSuperAdmin }];
    }),
  } as any;
}

const COMPANY_A = '11111111-1111-4111-8111-111111111111';
const COMPANY_B = '22222222-2222-4222-8222-222222222222';

describe('CompanyAccessGuard', () => {
  const guard = new CompanyAccessGuard(dataSourceStub(false), new TenantContextService());

  it('deja pasar rutas públicas sin usuario', async () => {
    const request: any = { headers: { 'x-company-id': COMPANY_B } };
    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
  });

  it('deja pasar cuando no viene x-company-id', async () => {
    const request: any = { user: { companies: [COMPANY_A] }, headers: {} };
    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
  });

  it('deja pasar cuando el usuario pertenece a la empresa y expone request.companyId', async () => {
    const request: any = {
      user: { companies: [COMPANY_A] },
      headers: { 'x-company-id': COMPANY_A },
    };
    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(request.companyId).toBe(COMPANY_A);
  });

  it('publica empresa y usuario en el TenantContext', async () => {
    const tenantContext = new TenantContextService();
    const contextGuard = new CompanyAccessGuard(dataSourceStub(false), tenantContext);
    const request: any = {
      user: { id: 'u-1', companies: [COMPANY_A] },
      headers: { 'x-company-id': COMPANY_A },
    };

    await tenantContext.run({ requestId: 'req-1', isSuperAdmin: false }, async () => {
      await contextGuard.canActivate(httpContext(request));
      expect(tenantContext.getCompanyId()).toBe(COMPANY_A);
      expect(tenantContext.get()?.userId).toBe('u-1');
    });
  });

  it('bloquea cuando el usuario NO pertenece a la empresa del header', async () => {
    const request: any = {
      user: { companies: [COMPANY_A] },
      headers: { 'x-company-id': COMPANY_B },
    };
    await expect(guard.canActivate(httpContext(request))).rejects.toThrow(ForbiddenException);
  });

  it('rechaza un x-company-id que no es UUID antes de tocar la DB', async () => {
    const ds = dataSourceStub(false);
    const uuidGuard = new CompanyAccessGuard(ds, new TenantContextService());
    const request: any = {
      user: { id: 'u-1', companies: [COMPANY_A] },
      headers: { 'x-company-id': 'empresa-b' },
    };
    await expect(uuidGuard.canActivate(httpContext(request))).rejects.toThrow(
      'x-company-id debe ser un UUID válido',
    );
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('bloquea si la membership fue eliminada aunque el JWT aún la liste', async () => {
    const revokedGuard = new CompanyAccessGuard(
      dataSourceStub(false, null),
      new TenantContextService(),
    );
    const request: any = {
      user: { id: 'u-1', companies: [COMPANY_A], companyVersions: { [COMPANY_A]: 0 } },
      headers: { 'x-company-id': COMPANY_A },
    };
    await expect(revokedGuard.canActivate(httpContext(request))).rejects.toThrow(
      'Ya no perteneces a esta empresa',
    );
  });

  it('exige refresh si token_version cambió para esa empresa', async () => {
    const staleGuard = new CompanyAccessGuard(
      dataSourceStub(false, { tokenVersion: 2 }),
      new TenantContextService(),
    );
    const request: any = {
      user: { id: 'u-1', companies: [COMPANY_A], companyVersions: { [COMPANY_A]: 1 } },
      headers: { 'x-company-id': COMPANY_A },
    };
    await expect(staleGuard.canActivate(httpContext(request))).rejects.toThrow(
      'Permisos desactualizados',
    );
  });

  it('super-admin no consulta membership ni versión', async () => {
    const ds = dataSourceStub(false, null);
    const superGuard = new CompanyAccessGuard(ds, new TenantContextService());
    const request: any = {
      user: { id: 'u-1', companies: [COMPANY_A], isSuperAdmin: true },
      headers: { 'x-company-id': COMPANY_A },
    };
    await expect(superGuard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('super-admin por claim accede a empresa ajena sin query extra y marca el flag', async () => {
    const ds = dataSourceStub(false);
    const superGuard = new CompanyAccessGuard(ds, new TenantContextService());
    const request: any = {
      user: { id: 'u-1', companies: [COMPANY_A], isSuperAdmin: true },
      headers: { 'x-company-id': COMPANY_B },
    };
    await expect(superGuard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(request.isSuperAdmin).toBe(true);
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('super-admin por DB accede a empresa ajena aunque el claim venga stale', async () => {
    const superGuard = new CompanyAccessGuard(dataSourceStub(true), new TenantContextService());
    const request: any = {
      user: { id: 'u-1', companies: [COMPANY_A], isSuperAdmin: false },
      headers: { 'x-company-id': COMPANY_B },
    };
    await expect(superGuard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(request.isSuperAdmin).toBe(true);
  });
});

describe('PermissionsGuard (scoped a la empresa)', () => {
  const reflector = {
    getAllAndOverride: () => ['core.users.read'],
  } as any;
  const guard = new PermissionsGuard(reflector);

  const user = {
    roles: ['Owner'],
    permissions: ['core.users.read'],
    companyRoles: { [COMPANY_A]: ['Owner'], [COMPANY_B]: ['Viewer'] },
    companyPermissions: { [COMPANY_A]: ['core.users.read'], [COMPANY_B]: [] },
  };

  it('permite si la empresa del header tiene el permiso', () => {
    const request: any = { user, headers: { 'x-company-id': COMPANY_A } };
    expect(guard.canActivate(httpContext(request))).toBe(true);
  });

  it('niega si el permiso solo existe en la primera empresa del token', () => {
    const request: any = { user, headers: { 'x-company-id': COMPANY_B } };
    expect(() => guard.canActivate(httpContext(request))).toThrow(ForbiddenException);
  });

  it('sin header mantiene el fallback a los permisos por defecto', () => {
    const request: any = { user, headers: {} };
    expect(guard.canActivate(httpContext(request))).toBe(true);
  });

  it('acepta el código legacy mientras dura la migración a core.*', () => {
    const legacyUser = {
      ...user,
      companyRoles: { [COMPANY_A]: ['Viewer'], [COMPANY_B]: ['Viewer'] },
      companyPermissions: { [COMPANY_A]: ['users:read'], [COMPANY_B]: [] },
    };
    const request: any = { user: legacyUser, headers: { 'x-company-id': COMPANY_A } };
    expect(guard.canActivate(httpContext(request))).toBe(true);
  });

  it('super-admin global pasa cualquier permiso y marca el flag', () => {
    const request: any = {
      user: { ...user, isSuperAdmin: true },
      headers: { 'x-company-id': COMPANY_B },
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
