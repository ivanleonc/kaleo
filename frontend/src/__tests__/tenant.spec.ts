import { describe, it, expect } from 'vitest';
import {
  resolveTenantByParam,
  tenantUrlParam,
  companyBasePath,
  companyPathFor,
} from '@/utils/tenant';
import type { Tenant } from '@/types/auth';

const tenants: Tenant[] = [
  { id: 'uuid-a', name: 'Acme', tax_id: null, slug: 'acme', roles: ['Owner'] },
  { id: 'uuid-b', name: 'Globex', tax_id: null, slug: null, roles: ['Viewer'] },
];

describe('resolveTenantByParam', () => {
  it('resuelve por slug', () => {
    expect(resolveTenantByParam(tenants, 'acme')?.id).toBe('uuid-a');
  });

  it('resuelve por id (enlaces legacy con UUID)', () => {
    expect(resolveTenantByParam(tenants, 'uuid-a')?.id).toBe('uuid-a');
  });

  it('devuelve undefined si no matchea', () => {
    expect(resolveTenantByParam(tenants, 'nope')).toBeUndefined();
    expect(resolveTenantByParam(undefined, 'acme')).toBeUndefined();
  });
});

describe('tenantUrlParam', () => {
  it('prefiere el slug', () => {
    expect(tenantUrlParam(tenants[0])).toBe('acme');
  });

  it('cae al id cuando no hay slug', () => {
    expect(tenantUrlParam(tenants[1])).toBe('uuid-b');
  });

  it('undefined sin tenant', () => {
    expect(tenantUrlParam(undefined)).toBeUndefined();
  });
});

describe('company path helpers', () => {
  it('arma base y ruta con slug', () => {
    expect(companyBasePath(tenants[0])).toBe('/companies/acme');
    expect(companyPathFor(tenants[0], '/members')).toBe('/companies/acme/members');
  });

  it('usa el id cuando no hay slug', () => {
    expect(companyPathFor(tenants[1], '/dashboard')).toBe('/companies/uuid-b/dashboard');
  });

  it('devuelve vacío sin tenant', () => {
    expect(companyBasePath(undefined)).toBe('');
    expect(companyPathFor(undefined, '/dashboard')).toBe('');
  });
});
