import { describe, expect, it } from 'vitest';
import type { EnabledModule } from '@saas/shared';
import { buildSidebarNav } from '@/components/layout/sidebar-nav';

function module(overrides: Partial<EnabledModule> = {}): EnabledModule {
  return {
    code: 'core.test',
    name: 'Test',
    version: '1.0.0',
    vertical: null,
    isCore: true,
    dependsOn: [],
    permissions: [],
    routes: [],
    status: 'enabled',
    ...overrides,
  };
}

describe('buildSidebarNav', () => {
  it('filtra por nav, permiso y rutas dinámicas, y ordena por order', () => {
    const modules = [
      module({
        code: 'core.users',
        name: 'Usuarios',
        routes: [
          { path: '/members', name: 'Members', title: 'Equipo', permission: 'core.users.read', nav: true, order: 30 },
          { path: '/members/:id', name: 'MemberDetail', title: 'Detalle', nav: false },
        ],
      }),
      module({
        code: 'core.dashboard',
        name: 'Panel',
        routes: [{ path: '/dashboard', name: 'Dashboard', title: 'Panel', nav: true, order: 10 }],
      }),
      module({
        code: 'core.audit',
        name: 'Auditoría',
        routes: [{ path: '/audit', name: 'Audit', title: 'Auditoría', permission: 'core.audit.read', nav: true, order: 60 }],
      }),
      module({
        code: 'shared.documents',
        name: 'Documentos',
        isCore: false,
        status: 'read_only',
        routes: [{ path: '/documents', name: 'Documents', title: 'Documentos', permission: 'core.documents.read', nav: true, order: 75 }],
      }),
    ];

    const items = buildSidebarNav(modules, (code) => code !== 'core.audit.read');

    expect(items.map((item) => item.name)).toEqual(['Dashboard', 'Members', 'Documents']);
    expect(items.find((item) => item.name === 'Documents')).toMatchObject({
      moduleCode: 'shared.documents',
      moduleStatus: 'read_only',
      isCore: false,
    });
  });
});
