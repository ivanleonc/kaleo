# Estructura del Backend

## Árbol de directorios anotado

```
backend/src/
│
├── app.module.ts          Módulo raíz: registra todos los módulos, guards globales
├── app.controller.ts      GET / (info) y GET /health (estado BD)
├── app.service.ts         HealthStatus con timeout de 5s
│
├── auth/
│   ├── auth.controller.ts      13 endpoints: login, register, refresh, etc.
│   ├── auth.service.ts         Facade: delega a los servicios especializados
│   ├── registration.service.ts Registro con transacción atómica
│   ├── session.service.ts      Login, logout, refresh, perfil, cambio de email
│   ├── password.service.ts     Cambio/reset de contraseña, historial de contraseñas
│   ├── dto/                    LoginDto, RegisterDto, UpdateProfileDto, etc.
│   ├── repositories/           user.repository, refresh-token.repository,
│   │                           token-blacklist.repository, password-history.repository
│   ├── guards/
│   │   ├── jwt-auth.guard.ts   Valida Bearer token, verifica blacklist
│   │   └── password-changed.guard.ts  Bloquea si must_change_password=true
│   └── strategies/
│       └── jwt.strategy.ts     Passport-JWT: extrae y verifica el token
│
├── members/
│   ├── member.controller.ts    10 endpoints para gestión de usuarios
│   ├── member.service.ts       Lógica de negocio
│   └── repositories/
│       └── member.repository.ts  Queries SQL paginadas con filtros y sort
│
├── company/
│   ├── company.controller.ts   5 endpoints
│   ├── company.service.ts
│   └── repositories/
│       └── company.repository.ts
│
├── branches/
│   ├── branches.controller.ts  4 endpoints CRUD
│   ├── branches.service.ts
│   └── repositories/
│       └── branch.repository.ts
│
├── rbac/
│   ├── rbac.controller.ts      7 endpoints para roles y permisos
│   ├── rbac.service.ts
│   └── repositories/
│       ├── role.repository.ts
│       └── permission.repository.ts
│
├── audit/
│   ├── audit-log.interceptor.ts  Interceptor global: captura todo
│   ├── audit-log.module.ts
│   ├── audit-log.controller.ts   3 endpoints: logs, export, entity-types
│   ├── audit-log.service.ts
│   ├── audit-log.repository.ts   SQL con cursor pagination
│   ├── audit-cursor.ts           Lógica de cursor pagination
│   └── audit-retention.service.ts  Limpieza automática >365 días
│
├── email/
│   ├── email.module.ts
│   ├── email.service.ts      Cadena: Brevo API → SMTP → Stub
│   └── templates.ts          Plantillas HTML de cada tipo de email
│
├── two-factor/
│   └── (tipos para TOTP — implementación pendiente)
│
├── common/
│   ├── config/
│   │   └── env.validation.ts   Esquema Joi: valida al arrancar
│   ├── constants/
│   │   ├── brand.ts            APP_NAME, BRAND_SLUG
│   │   ├── headers.ts          COMPANY_ID_HEADER = 'x-company-id'
│   │   ├── permissions.ts      Espejo de packages/shared
│   │   └── roles.ts            Espejo de packages/shared
│   ├── decorators/
│   │   ├── public.decorator.ts          @Public() — bypassa JwtAuthGuard
│   │   ├── require-permissions.decorator.ts  @RequirePermissions('users:read')
│   │   ├── roles.decorator.ts           @Roles(SystemRoles.OWNER)
│   │   ├── current-user.decorator.ts    @CurrentUser() en parámetro de método
│   │   ├── skip-password-changed.decorator.ts  @SkipPasswordChanged()
│   │   └── audit.decorator.ts           @Audit({ ... })
│   ├── dto/
│   │   ├── pagination-query.dto.ts  PaginationQueryDto: page, limit, sortBy, sortDir
│   │   ├── api-response.ts          Ok(), OkPaged(), OkCursor() helpers de respuesta
│   │   └── audit-query.dto.ts       Filtros de auditoría
│   ├── filters/
│   │   └── sentry-exception.filter.ts  Captura 5xx → Sentry
│   ├── guards/
│   │   ├── company-access.guard.ts
│   │   ├── permissions.guard.ts
│   │   ├── roles.guard.ts
│   │   └── super-admin.guard.ts
│   ├── middleware/
│   │   └── request-logger.middleware.ts  Pino JSON: request-id, método, URL, duración
│   ├── types/
│   │   └── db-rows.ts   Interfaces de filas SQL: CompanyRow, RoleRow, BranchRow, etc.
│   └── utils/
│       ├── db.ts                rows<T>(), row<T>(), typedQuery<T>()
│       ├── sql.helper.ts        buildWhere(), buildDynamicUpdate(), buildOrderBy()
│       ├── transaction.helper.ts  runInTransaction()
│       └── membership.helper.ts   assertMember(), insertUserContexts()
│
└── migrations/           SQL versionado (ver sección Migraciones)
    ├── 000-baseline-schema.sql
    └── ... 017-add-super-admin-flag.sql
```

## Patrón de módulo

Cada módulo de dominio sigue la misma estructura:

```
módulo/
  ├── modulo.module.ts         @Module({ controllers, providers })
  ├── modulo.controller.ts     @Controller, @Get/@Post/@Patch/@Delete, guards, DTOs
  ├── modulo.service.ts        Lógica de negocio, delega al repository
  ├── repositories/
  │   └── modulo.repository.ts  SQL crudo con rows<T>(), @Injectable()
  └── dto/
      ├── create-modulo.dto.ts  class-validator decorators
      └── update-modulo.dto.ts
```

## `app.module.ts` — guards y configuración global

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    TypeOrmModule.forRootAsync({ /* PostgreSQL connection */ }),
    // Módulos de dominio:
    AuthModule, CompanyModule, MemberModule, BranchesModule,
    RbacModule, AuditLogModule, EmailModule,
  ],
  providers: [
    // Guards globales — en orden de ejecución:
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PasswordChangedGuard },
    { provide: APP_GUARD, useClass: CompanyAccessGuard },
    // Interceptor global de auditoría:
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
```

## Orden de ejecución de guards

```
Cada request
  1. ThrottlerGuard      → ¿rate limit excedido?
  2. JwtAuthGuard        → ¿token válido? ¿en blacklist?
  3. PasswordChangedGuard → ¿debe cambiar contraseña?
  4. CompanyAccessGuard  → ¿usuario pertenece a la empresa del x-company-id?
  5. PermissionsGuard    → ¿tiene el permiso del @RequirePermissions()?
  6. RolesGuard          → ¿tiene el rol del @Roles()?
```

Los guards se cortocircuitan: si alguno rechaza, los siguientes no se ejecutan.

## `AuditLogInterceptor`

Registra automáticamente cada request/response no marcado con `@Audit({ skip: true })`:

- Captura: método HTTP, ruta, usuario, empresa, IP, body sanitizado, respuesta, duración
- Sanitiza: passwords, tokens, campos sensibles
- Enriquece: tipo de entidad, ID de entidad afectada
- Inserta en `audit_logs` de forma asíncrona (no bloquea la respuesta)
