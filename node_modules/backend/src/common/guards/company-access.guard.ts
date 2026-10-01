import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
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
 */
@Injectable()
export class CompanyAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return true;

    const companyId = request.headers?.[COMPANY_ID_HEADER];
    if (!companyId) return true;

    const companies: string[] = Array.isArray(user.companies) ? user.companies : [];
    if (!companies.includes(companyId)) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    request.companyId = companyId;
    return true;
  }
}
