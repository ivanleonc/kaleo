import { SetMetadata } from '@nestjs/common';

export const AUDIT_CONTEXT_KEY = 'audit_context';

export type AuditEntityType =
  | 'Auth'
  | 'User'
  | 'Company'
  | 'Member'
  | 'Role'
  | 'Permission'
  | 'Branch'
  | 'Settings'
  | 'Audit';

export interface AuditContextOptions {
  /** Entidad afectada. Evita que el interceptor la infiera del path. */
  entityType: AuditEntityType;
  /** Nombre del parámetro de ruta con el UUID de la entidad (ej. 'branchId'). */
  idParam?: string;
  /** Extrae el id creado cuando la operación es un POST. */
  resolveCreatedId?: (response: any) => string | undefined;
  /** Desactiva la captura de valores antes/después. */
  skipDiff?: boolean;
}

/**
 * Declara explícitamente qué entidad audita un handler.
 *
 * Antes el interceptor deducía la entidad parseando la URL
 * (`/companies/:id/users` → Member), lo que se rompía con rutas nuevas.
 * Con este decorador la intención queda documentada junto al endpoint.
 *
 * @example
 * ```ts
 * @Patch(':id')
 * @Audit({ entityType: 'Company', idParam: 'id' })
 * async updateCompany(...)
 * ```
 */
export const Audit = (options: AuditContextOptions) => SetMetadata(AUDIT_CONTEXT_KEY, options);
