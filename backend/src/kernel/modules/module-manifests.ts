import { Permissions } from '../../common/constants/permissions.js';
import type { ModuleManifest } from './module-manifest.types.js';

export const MODULE_MANIFESTS_TOKEN = Symbol('MODULE_MANIFESTS');

/**
 * Manifests de los módulos core actuales.
 *
 * Los `core.*` son always-on y no se habilitan por empresa. Los módulos
 * shared/pack futuros se registrarán aquí y se activarán con `company_modules`.
 */
export const MODULE_MANIFESTS: ModuleManifest[] = [
  {
    code: 'core.dashboard',
    name: 'Panel',
    version: '1.0.0',
    vertical: null,
    isCore: true,
    dependsOn: [],
    permissions: [],
    routes: [
      { path: '/dashboard', name: 'Dashboard', title: 'Panel', icon: 'dashboard', nav: true, order: 10 },
    ],
  },
  {
    code: 'core.analyses',
    name: 'Analítica',
    version: '1.0.0',
    vertical: 'energy',
    isCore: true,
    dependsOn: [],
    permissions: [
      Permissions.ANALYSES.READ,
      Permissions.ANALYSES.CREATE,
      Permissions.ANALYSES.UPDATE,
      Permissions.ANALYSES.DELETE,
    ],
    routes: [
      {
        path: '/analyses',
        name: 'Analyses',
        title: 'Analítica',
        permission: Permissions.ANALYSES.READ,
        icon: 'analyses',
        nav: true,
        order: 20,
      },
      {
        path: '/analyses/:analysisId',
        name: 'AnalysisDetail',
        title: 'Analítica',
        permission: Permissions.ANALYSES.READ,
        icon: 'analyses',
        nav: false,
        order: 21,
      },
    ],
  },
  {
    code: 'core.users',
    name: 'Usuarios y miembros',
    version: '1.0.0',
    vertical: null,
    isCore: true,
    dependsOn: [],
    permissions: [
      Permissions.USERS.READ,
      Permissions.USERS.CREATE,
      Permissions.USERS.UPDATE,
      Permissions.USERS.DELETE,
    ],
    routes: [
      {
        path: '/members',
        name: 'Members',
        title: 'Equipo',
        permission: Permissions.USERS.READ,
        icon: 'users',
        nav: true,
        order: 30,
      },
    ],
  },
  {
    code: 'core.branches',
    name: 'Sedes',
    version: '1.0.0',
    vertical: null,
    isCore: true,
    dependsOn: [],
    permissions: [
      Permissions.BRANCHES.READ,
      Permissions.BRANCHES.CREATE,
      Permissions.BRANCHES.UPDATE,
      Permissions.BRANCHES.DELETE,
    ],
    routes: [
      {
        path: '/branches',
        name: 'Branches',
        title: 'Sedes',
        permission: Permissions.BRANCHES.READ,
        icon: 'branches',
        nav: true,
        order: 40,
      },
    ],
  },
  {
    code: 'core.roles',
    name: 'Roles y permisos',
    version: '1.0.0',
    vertical: null,
    isCore: true,
    dependsOn: [],
    permissions: [
      Permissions.ROLES.READ,
      Permissions.ROLES.CREATE,
      Permissions.ROLES.UPDATE,
      Permissions.ROLES.DELETE,
    ],
    routes: [
      {
        path: '/roles',
        name: 'Roles',
        title: 'Roles',
        permission: Permissions.ROLES.READ,
        icon: 'roles',
        nav: true,
        order: 50,
      },
    ],
  },
  {
    code: 'core.audit',
    name: 'Auditoría',
    version: '1.0.0',
    vertical: null,
    isCore: true,
    dependsOn: [],
    permissions: [Permissions.AUDIT.READ],
    routes: [
      {
        path: '/audit',
        name: 'Audit',
        title: 'Auditoría',
        permission: Permissions.AUDIT.READ,
        icon: 'audit',
        nav: true,
        order: 60,
      },
    ],
  },
  {
    code: 'core.company',
    name: 'Empresa y configuración',
    version: '1.0.0',
    vertical: null,
    isCore: true,
    dependsOn: [],
    permissions: [Permissions.COMPANY.READ, Permissions.COMPANY.UPDATE],
    routes: [
      {
        path: '/settings',
        name: 'Settings',
        title: 'Ajustes',
        permission: Permissions.COMPANY.READ,
        icon: 'settings',
        nav: true,
        order: 70,
      },
    ],
  },
  {
    code: 'core.features',
    name: 'Feature flags',
    version: '1.0.0',
    vertical: null,
    isCore: true,
    dependsOn: [],
    permissions: [],
    routes: [],
  },
];
