import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { COMPANY_ID_HEADER } from '../constants/headers.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Igual que en PermissionsGuard: el rol se resuelve contra la empresa del
    // header, no contra la primera empresa del token.
    const companyId: string | undefined = request.headers?.[COMPANY_ID_HEADER];
    const userRoles: string[] = companyId
      ? (user.companyRoles?.[companyId] ?? [])
      : (user.roles ?? []);

    // Super-admin bypass (global): ver comentario en PermissionsGuard.
    if (user.isSuperAdmin === true) {
      request.isSuperAdmin = true;
      return true;
    }

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(`Se requiere uno de estos roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
