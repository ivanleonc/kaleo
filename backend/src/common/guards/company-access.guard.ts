import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { COMPANY_ID_HEADER } from '../constants/headers.js';
import { TenantContextService } from '../tenancy/tenant-context.service.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 * El caso común (miembro con `x-company-id`) valida la membership activa y su
 * `token_version` contra la base: es el precio de revocar accesos/roles sin
 * esperar a que expire el access token. El super-admin no paga esa query.
 */
@Injectable()
export class CompanyAccessGuard implements CanActivate {
  constructor(
    @InjectDataSource('auth') private dataSource: DataSource,
    private tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return true;

    this.tenantContext.setUser(user.id, user.isSuperAdmin === true);

    const companyId = request.headers?.[COMPANY_ID_HEADER];
    if (!companyId) return true;
    if (!UUID_RE.test(companyId)) {
      throw new BadRequestException('x-company-id debe ser un UUID válido');
    }

    const companies: string[] = Array.isArray(user.companies) ? user.companies : [];

    // Super-admin global: acceso virtual, sin membership ni versión.
    if (user.isSuperAdmin === true) {
      request.companyId = companyId;
      request.isSuperAdmin = true;
      this.tenantContext.setCompany(companyId, user.id, true);
      return true;
    }

    if (companies.includes(companyId)) {
      // La lista `companies` del JWT puede estar desactualizada: la membership
      // activa es la fuente de verdad. Además, `token_version` invalida claims
      // de esa empresa (roles/permisos) sin tocar las sesiones de otras.
      const rows = await this.dataSource.query(
        `SELECT token_version
         FROM memberships
         WHERE company_id = $1 AND user_id = $2 AND status = 'active'
         LIMIT 1`,
        [companyId, user.id],
      );
      if (rows.length === 0) {
        throw new ForbiddenException('Ya no perteneces a esta empresa');
      }

      const dbVersion = Number(rows[0].token_version ?? 0);
      const tokenVersion = Number(user.companyVersions?.[companyId] ?? 0);
      if (dbVersion !== tokenVersion) {
        // 401 para que el cliente refresque el access token y reciba los
        // claims actuales de esta empresa. El refresh no afecta a las demás.
        throw new UnauthorizedException('Permisos desactualizados. Vuelve a iniciar sesión.');
      }

      request.companyId = companyId;
      this.tenantContext.setCompany(companyId, user.id, false);
      return true;
    }

    // Miss-path: ¿super-admin global? Claim ya descartado arriba; la DB es la
    // fuente de verdad para tokens emitidos antes de otorgar el flag.
    if (user.id) {
      const rows = await this.dataSource.query(
        `SELECT is_super_admin FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [user.id],
      );
      if (rows[0]?.is_super_admin === true) {
        request.companyId = companyId;
        request.isSuperAdmin = true;
        this.tenantContext.setCompany(companyId, user.id, true);
        return true;
      }
    }

    throw new ForbiddenException('No tienes acceso a esta empresa');
  }
}
