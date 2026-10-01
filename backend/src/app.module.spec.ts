import { describe, it, expect, vi } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

/**
 * Regresión: AppController/AppService deben estar registrados en el módulo
 * real. Sin esto, `/` y `/health` devuelven 404 en runtime (el health check
 * del hosting nunca pasa) aunque los tests del controlador estén en verde,
 * porque esos montan su propio módulo de prueba.
 *
 * Los mocks van al top-level porque Vitest los hoistea de todas formas;
 * ponerlos dentro de un `it()` genera warnings y será un error en futuras versiones.
 * Mockeamos los módulos que ejecutan efectos al importarse (Joi, TypeORM, etc.)
 * para que el test pueda inspeccionar los metadatos de AppModule sin
 * necesitar variables de entorno reales.
 */

vi.mock('@nestjs/config', () => ({
  ConfigModule: { forRoot: vi.fn().mockReturnValue({ module: class MockConfigModule {} }) },
  ConfigService: vi.fn(),
}));
vi.mock('@nestjs/typeorm', () => ({
  TypeOrmModule: {
    forRootAsync: vi.fn().mockReturnValue({ module: class MockTypeOrmModule {} }),
  },
}));
vi.mock('@nestjs/throttler', () => ({
  ThrottlerModule: { forRoot: vi.fn().mockReturnValue({ module: class MockThrottlerModule {} }) },
  ThrottlerGuard: vi.fn(),
}));
vi.mock('./auth/auth.module.js', () => ({ AuthModule: class AuthModule {} }));
vi.mock('./company/company.module.js', () => ({ CompanyModule: class CompanyModule {} }));
vi.mock('./audit/audit-log.module.js', () => ({
  AuditLogModule: class AuditLogModule {},
  AuditLogInterceptor: vi.fn(),
}));
vi.mock('./email/email.module.js', () => ({ EmailModule: class EmailModule {} }));
vi.mock('./rbac/rbac.module.js', () => ({ RbacModule: class RbacModule {} }));
vi.mock('./members/member.module.js', () => ({ MemberModule: class MemberModule {} }));
vi.mock('./branches/branches.module.js', () => ({ BranchesModule: class BranchesModule {} }));
vi.mock('./common/middleware/request-logger.middleware.js', () => ({
  RequestLoggerMiddleware: class RequestLoggerMiddleware {},
}));
vi.mock('./common/config/env.validation.js', () => ({ envValidationSchema: {} }));

describe('AppModule metadata', () => {
  it('registra AppController y AppService (health check en runtime)', async () => {
    const { AppModule } = await import('./app.module.js');

    const controllers = Reflect.getMetadata('controllers', AppModule) as unknown[];
    const providers = Reflect.getMetadata('providers', AppModule) as unknown[];

    expect(controllers).toContain(AppController);
    expect(providers).toContain(AppService);
  });
});
