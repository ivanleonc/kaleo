import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { CompanyModule } from './company/company.module.js';
import { AuditLogModule } from './audit/audit-log.module.js';
import { AuditLogInterceptor } from './audit/audit-log.interceptor.js';
import { EmailModule } from './email/email.module.js';
import { RbacModule } from './rbac/rbac.module.js';
import { MemberModule } from './members/member.module.js';
import { BranchesModule } from './branches/branches.module.js';
import { AnalysesModule } from './analyses/analyses.module.js';
import { FeatureFlagsModule } from './features/feature-flags.module.js';
import { InvitationsModule } from './invitations/invitations.module.js';
import { ModuleRegistryModule } from './kernel/modules/module-registry.module.js';
import { EntitlementModule } from './kernel/billing/entitlement.module.js';
import { CompanySettingsModule } from './kernel/tenancy/company-settings.module.js';
import { JobsModule } from './kernel/jobs/jobs.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { PasswordChangedGuard } from './auth/guards/password-changed.guard.js';
import { CompanyAccessGuard } from './common/guards/company-access.guard.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware.js';
import { TenantContextModule } from './common/tenancy/tenant-context.module.js';
import { OutboxModule } from './outbox/outbox.module.js';
import { TenantContextMiddleware } from './common/tenancy/tenant-context.middleware.js';
import { envValidationSchema } from './common/config/env.validation.js';
import { databaseSslOptions } from './common/config/database-ssl.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env.[NODE_ENV] manda; .env queda como default local.
      // Ej: NODE_ENV=development -> .env.development, luego .env
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      // Valida TODAS las variables al arrancar: falla rápido con mensaje claro
      // si falta algo crítico o hay un valor incorrecto.
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 30,
    }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        // Conexión por defecto: rol runtime sin BYPASSRLS. Fallback al admin
        // mientras se configura DATABASE_APP_URL.
        url: configService.get<string>('DATABASE_APP_URL') || configService.get<string>('DATABASE_URL'),
        ssl: databaseSslOptions(),
        autoLoadEntities: true,
        synchronize: false,
        // Ninguna consulta espera eternamente: ante pooler saturado o
        // latencia (incidentes), se falla rápido en vez de colgar deploys.
        extra: {
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          statement_timeout: 10000,
          query_timeout: 15000,
        },
      }),
    }),
    // DataSource privilegiado SOLO para auth/onboarding/auditoría/outbox.
    // Con DATABASE_AUTH_URL apunta a kaleo_auth (BYPASSRLS); si falta,
    // mantiene el comportamiento anterior usando DATABASE_URL.
    TypeOrmModule.forRootAsync({
      name: 'auth',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_AUTH_URL') || configService.get<string>('DATABASE_URL'),
        ssl: databaseSslOptions(),
        entities: [],
        synchronize: false,
        extra: {
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          statement_timeout: 10000,
          query_timeout: 15000,
        },
      }),
    }),
    TenantContextModule,
    OutboxModule,
    AuditLogModule,
    EmailModule,
    AuthModule,
    CompanyModule,
    RbacModule,
    MemberModule,
    BranchesModule,
    AnalysesModule,
    FeatureFlagsModule,
    InvitationsModule,
    ModuleRegistryModule,
    EntitlementModule,
    CompanySettingsModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PasswordChangedGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CompanyAccessGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // El middleware de logging se aplica a todas las rutas y es el primero
    // en la cadena: así el request-id existe cuando llegan los guards.
    consumer.apply(RequestLoggerMiddleware, TenantContextMiddleware).forRoutes('*');
  }
}
