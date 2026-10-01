import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_PASSWORD_CHANGED_KEY } from '../decorators/skip-password-changed.decorator.js';

@Injectable()
export class PasswordChangedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_PASSWORD_CHANGED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && user.must_change_password) {
      throw new ForbiddenException('Debes cambiar tu contraseña temporal antes de continuar.');
    }
    return true;
  }
}
