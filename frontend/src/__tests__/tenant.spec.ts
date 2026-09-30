import { describe, it, expect } from 'vitest';
import {
  resolveTenantByParam,
  tenantUrlParam,
  companyBasePath,
  companyPathFor,
  preservableSection,
  PRESERVABLE_SECTIONS,
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

describe('preservableSection', () => {
  it('conserva la sección quitando el parámetro de empresa (slug o UUID)', () => {
    expect(preservableSection('/companies/acme/members', 'Members')).toBe('/members');
    expect(preservableSection('/companies/uuid-a/audit', 'Audit')).toBe('/audit');
    expect(preservableSection('/companies/acme/dashboard', 'Dashboard')).toBe('/dashboard');
  });

  it('conserva secciones anidadas tal cual', () => {
    expect(preservableSection('/companies/acme/settings/plan', 'Settings')).toBe(
      '/settings/plan',
    );
  });

  it.each([...PRESERVABLE_SECTIONS])('cubre la ruta conocida %s', (name) => {
    expect(preservableSection(`/companies/acme/${name.toLowerCase()}`, name)).not.toBe('');
  });

  it('cae al dashboard fuera de secciones conocidas', () => {
    // NotFound dentro de la empresa: no tiene sentido preservarla.
    expect(preservableSection('/companies/acme/xyz', 'NotFound')).toBe('/dashboard');
    // Rutas fuera de /companies (login, onboarding…) aunque el nombre coincida.
    expect(preservableSection('/login', 'Login')).toBe('/dashboard');
    // Nombre desconocido o ausente: no preservar.
    expect(preservableSection('/companies/acme/members', 'Report')).toBe('/dashboard');
    expect(preservableSection('/companies/acme/members', undefined)).toBe('/dashboard');
    // Símbolos (nombres internos de ruta) tampoco preservan.
    expect(preservableSection('/companies/acme/members', Symbol('Members'))).toBe('/dashboard');
  });

  it('cae al dashboard ante la ruta base de empresa sin sección', () => {
    expect(preservableSection('/companies/acme', 'Dashboard')).toBe('/dashboard');
  });
});
