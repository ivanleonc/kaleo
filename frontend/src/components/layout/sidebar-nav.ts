import type { EnabledModule, ModuleRoute, ModuleStatus } from '@saas/shared';

export interface SidebarNavItem extends ModuleRoute {
  moduleCode: string;
  moduleName: string;
  moduleStatus: ModuleStatus;
  isCore: boolean;
}

/**
 * Construye la navegación del sidebar desde los manifests que devuelve el
 * backend. Es una función pura para poder testearla sin montar el layout.
 */
export function buildSidebarNav(
  modules: EnabledModule[],
  hasPermission: (code: string) => boolean,
): SidebarNavItem[] {
  return modules
    .flatMap((module) =>
      module.routes
        .filter((route) => route.nav === true)
        .filter((route) => !route.path.includes(':'))
        .filter((route) => !route.permission || hasPermission(route.permission))
        .map((route) => ({
          ...route,
          moduleCode: module.code,
          moduleName: module.name,
          moduleStatus: module.status,
          isCore: module.isCore,
        })),
    )
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}
