import type { Tenant } from '@/types/auth';

/**
 * Helpers puros de resolución de tenant.
 *
 * El parámetro de URL puede ser un `slug` (canónico) o, por compatibilidad con
 * enlaces viejos, un `id` (UUID). El UUID sigue siendo lo único que viaja en el
 * header `x-company-id` y lo único que identifica a la empresa ante el API.
 */

/** Resuelve el tenant de la URL: primero por slug, luego por id (legacy). */
export function resolveTenantByParam(
  tenants: Tenant[] | undefined,
  param: string | undefined,
): Tenant | undefined {
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
