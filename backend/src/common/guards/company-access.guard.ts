import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { COMPANY_ID_HEADER } from '../constants/headers.js';

/**
 * Valida que el usuario autenticado pertenezca a la empresa que declara en
 * `x-company-id`.
 *
 * Se registra como APP_GUARD (después de JwtAuthGuard) porque el header es el
 * único selector de tenant en casi todos los endpoints: members, branches,
 * audit y rbac lo usan como filtro directo en la query. Sin esta validación,
 * cambiar el UUID en el header bastaba para leer o escribir los datos de otra
 * empresa.
 *
 * Se saltea cuando:
 * - la ruta no es HTTP,
 * - no hay `request.user` (rutas públicas; JwtAuthGuard ya validó el token),
 * - no viene el header (endpoints no vinculados a empresa, p.ej. auth o profile).
 *
 * Cuando no viene el header los repositorios filtran por `company_id = NULL`,
 * que no devuelve filas, así que ese caso falla cerrado por sí solo.
 *
 * Excepción super-admin: si la empresa del header no está en el JWT pero el
 * usuario es super-admin global, se permite el acceso virtual (sin filas en
 * user_contexts). La verificación es solo en el miss-path: el caso común
 * (miembro real) no agrega ninguna query.
 */
@Injectable()
export class CompanyAccessGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return true;

    const companyId = request.headers?.[COMPANY_ID_HEADER];
    if (!companyId) return true;

    const companies: string[] = Array.isArray(user.companies) ? user.companies : [];
    if (companies.includes(companyId)) {
      request.companyId = companyId;
      return true;
    }

    // Miss-path: ¿super-admin global? Claim primero (rápido), DB como
    // fuente de verdad (cubre tokens emitidos antes de otorgar el flag).
    if (user.isSuperAdmin === true) {
      request.companyId = companyId;
      request.isSuperAdmin = true;
      return true;
    }
    if (user.id) {
      const rows = await this.dataSource.query(
        `SELECT is_super_admin FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [user.id],
      );
      if (rows[0]?.is_super_admin === true) {
        request.companyId = companyId;
        request.isSuperAdmin = true;
        return true;
      }
    }

    throw new ForbiddenException('No tienes acceso a esta empresa');
  }
}
