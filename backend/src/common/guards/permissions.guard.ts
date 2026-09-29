import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { SystemRoles } from '../constants/roles.js';
import { COMPANY_ID_HEADER } from '../constants/headers.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Los permisos van por empresa: `user.permissions` del token solo refleja
    // la primera empresa, así que usarlo haría que un miembro de la empresa A
    // pasara el control al operar sobre la empresa B.
    const companyId: string | undefined = request.headers?.[COMPANY_ID_HEADER];

    const userPermissions: string[] = companyId
      ? (user.companyPermissions?.[companyId] ?? [])
      : (user.permissions ?? []);

    // Owner bypass
    const userRoles: string[] = companyId
      ? (user.companyRoles?.[companyId] ?? [])
      : (user.roles ?? []);
    if (userRoles.includes(SystemRoles.OWNER)) {
      return true;
    }

    const hasPermission = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasPermission) {
      throw new ForbiddenException(
        `Permisos requeridos: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
