/**
 * Tipos de fila para las queries SQL crudas de los repositorios.
 *
 * Se definen aquí (en vez de en cada repositorio) para que los servicios
 * y controladores puedan referenciarlos en sus firmas de retorno sin
 * causar el error TS4053 ("Return type uses private name from external module").
 *
 * Convención de nombres: `<Entidad>Row` para resultados de SELECT,
 * `<Entidad>IdRow` para queries que solo retornan el ID.
 */

export interface CompanyRow {
  id: string;
  name: string;
  tax_id: string | null;
  slug: string | null;
  is_active: boolean;
  logo_url?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  timezone?: string | null;
  created_at?: string;
  updated_at?: string;
  member_count?: number;
}

/** Empresa con sus roles, tal como la ve un usuario (tenant). */
export interface TenantRow {
  id: string;
  name: string;
  tax_id: string | null;
  slug: string | null;
  roles: string[];
}

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  company_id: string | null;
  is_system?: boolean;
  permissions?: PermissionRow[];
}

export interface PermissionRow {
  id: string;
  name: string;
  code: string;
  module: string;
}

export interface BranchRow {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  code?: string | null;
  is_main?: boolean;
  manager_user_id?: string | null;
  manager_name?: string | null;
  timezone?: string | null;
  created_at: string;
  updated_at: string;
}

/** Resultado genérico de queries que solo retornan el ID de una fila. */
export interface IdRow {
  id: string;
}

/** Resultado de queries que retornan un nombre de rol. */
export interface RoleNameRow {
  role_name: string;
}
