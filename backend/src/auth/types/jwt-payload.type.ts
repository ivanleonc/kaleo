/**
 * Forma del payload JWT emitido por session.service.ts y registration.service.ts.
 *
 * Todos los guards y la JwtStrategy deben usar este tipo en lugar de `any`
 * para detectar en tiempo de compilación si el payload cambia.
 */
export interface JwtPayload {
  /** UUID del usuario */
  id: string;
  /** Si true, el usuario debe cambiar su contraseña temporal antes de continuar */
  must_change_password: boolean;
  /** Lista de UUIDs de empresas a las que pertenece el usuario */
  companies: string[];
  /**
   * Roles del usuario por empresa: { [companyId]: ['Owner', 'Admin', ...] }
   * El guard de roles lee este mapa contra el x-company-id del request.
   */
  companyRoles: Record<string, string[]>;
  /**
   * Permisos del usuario por empresa: { [companyId]: ['core.users.read', ...] }
   * El guard de permisos lee este mapa contra el x-company-id del request.
   */
  companyPermissions: Record<string, string[]>;
  /**
   * Versión de acceso por empresa: { [companyId]: number }
   * CompanyAccessGuard compara este valor con memberships.token_version para
   * invalidar claims desactualizados sin afectar a otras empresas.
   */
  companyVersions?: Record<string, number>;
  /** Roles del tenant por defecto (primer tenant) — para compatibilidad */
  roles: string[];
  /** Permisos del tenant por defecto (primer tenant) — para compatibilidad */
  permissions: string[];
  /**
   * Super-administrador global (columna users.is_super_admin).
   * Otorga acceso virtual a TODAS las empresas sin membership.
   * Solo se otorga por SQL directo; ningún endpoint escribe esta columna.
   */
  isSuperAdmin: boolean;
}
