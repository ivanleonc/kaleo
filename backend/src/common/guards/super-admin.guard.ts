import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Permite solo a super-administradores globales (`users.is_super_admin`).
 *
 * Se usa en endpoints sin contexto de empresa (ej. `GET /api/companies/all`),
 * donde `PermissionsGuard` no aplica porque no hay `x-company-id` contra el
 * cual evaluar permisos.
 *
 * Verificación en dos niveles:
 * 1. Claim del JWT (`request.user.isSuperAdmin`) — rápido, sin query extra.
 * 2. Si el claim falta o es falso (token emitido antes de otorgar el flag),
 *    una sola query indexada por PK como fuente de verdad.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.id) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (user.isSuperAdmin === true) {
      request.isSuperAdmin = true;
      return true;
    }

    const rows = await this.dataSource.query(
      `SELECT is_super_admin FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [user.id],
    );
    if (rows[0]?.is_super_admin === true) {
      request.isSuperAdmin = true;
      return true;
    }

    throw new ForbiddenException('Se requiere acceso de super-administrador');
  }
}
