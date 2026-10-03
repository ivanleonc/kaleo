import type { Tenant } from '@/types/auth';

/**
 * Helpers puros de resolución de tenant.
 *
 * El parámetro de URL puede ser un `slug` (canónico) o, por compatibilidad con
 * enlaces viejos, un `id` (UUID). El UUID sigue siendo lo único que viaja en el
 * header `x-company-id` y lo único que identifica a la empresa ante el API.
 */

/** Resuelve el tenant de la URL: primero por slug, luego por id (legacy). */
export function resolveTenantByParam<T extends Pick<Tenant, 'id' | 'slug'>>(
  tenants: T[] | undefined,
  param: string | undefined,
): T | undefined {
  if (!param || !tenants?.length) return undefined;
  return (
    tenants.find((t) => t.slug && t.slug === param) ?? tenants.find((t) => t.id === param)
  );
}

/** Valor legible para la URL: slug si existe, si no el UUID. */
export function tenantUrlParam(tenant: Tenant | undefined): string | undefined {
  return tenant?.slug ?? tenant?.id;
}

/** Base `/companies/<param>` o '' si no hay tenant. */
export function companyBasePath(tenant: Tenant | undefined): string {
  const param = tenantUrlParam(tenant);
  return param ? `/companies/${param}` : '';
}

/** Ruta completa a una sección de la empresa. */
export function companyPathFor(tenant: Tenant | undefined, suffix = ''): string {
  const base = companyBasePath(tenant);
  return base ? `${base}${suffix}` : '';
}

/**
 * Secciones cuya permanencia tiene sentido al cambiar de empresa.
 * Cualquier otra ruta (NotFound, Onboarding, auth pública…) cae al Panel.
 */
export const PRESERVABLE_SECTIONS: ReadonlySet<string> = new Set([
  'Dashboard',
  'Settings',
  'Profile',
  'ChangePassword',
  'Members',
  'Branches',
  'Roles',
  'Audit',
]);

/**
 * Sección a conservar al cambiar de empresa: quita el prefijo
 * `/companies/<companyId>` del path (misma regex que usa el guard de rutas
 * para canonizar). Devuelve `/dashboard` cuando la ruta actual no es una
 * sección conocida de empresa.
 *
 * Nota: la comprobación de permisos la hace el guard de rutas (ya con los
 * claims frescos de la nueva empresa), que redirige al Panel la sección
 * denegada — por eso aquí basta con la sección.
 */
export function preservableSection(
  currentPath: string,
  routeName: string | symbol | null | undefined,
): string {
  if (
    typeof routeName === 'string' &&
    PRESERVABLE_SECTIONS.has(routeName) &&
    currentPath.startsWith('/companies/')
  ) {
    return currentPath.replace(/^\/companies\/[^/]+/, '') || '/dashboard';
  }
  return '/dashboard';
}
