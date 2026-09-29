import { Module } from '@nestjs/common';
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
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { PasswordChangedGuard } from './auth/guards/password-changed.guard.js';
import { CompanyAccessGuard } from './common/guards/company-access.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env.[NODE_ENV] manda; .env queda como default local.
      // Ej: NODE_ENV=sandbox -> .env.sandbox, luego .env
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 30,
    }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    AuditLogModule,
    EmailModule,
    AuthModule,
    CompanyModule,
    RbacModule,
    MemberModule,
    BranchesModule,
  ],
  providers: [
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
export class AppModule {}
