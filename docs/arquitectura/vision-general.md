# Visión General de la Arquitectura

Kaleo es una plataforma SaaS multi-tenant construida en capas claramente separadas. Cada capa tiene una responsabilidad única y solo se comunica con las capas adyacentes.

## Diagrama de capas

```
┌─────────────────────────────────────────────────────────────────┐
│                         NAVEGADOR                               │
├─────────────────────────────────────────────────────────────────┤
│  View (.vue)                                                    │
│    ├── Feature Component (components/features/**/*)            │
│    │     └── Ui Component (components/ui/Ui*.vue)              │
│    └── Composable (composables/use*.ts)                         │
│          ├── Store (stores/*.store.ts)                          │
│          │     └── Service (services/*.service.ts)              │
│          │           └── apiClient (api/axios.ts)              │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP + JWT + x-company-id
┌──────────────────────────────▼──────────────────────────────────┐
│                     BACKEND (NestJS)                            │
│  Guards → Controller → Service                                  │
│                 └── Repository (raw SQL)                        │
│                       └── TypeORM DataSource                   │
│                             └── PostgreSQL (Supabase)          │
└─────────────────────────────────────────────────────────────────┘
```

## Reglas de arquitectura

| # | Regla | Razón |
|---|---|---|
| 1 | Las views **no llaman a `apiClient` directamente** | Todo pasa por el store o un composable |
| 2 | Los stores paginados usan **`usePaginatedSetup`** | Evita ~80 líneas de boilerplate idéntico por módulo |
| 3 | Los feature components **emiten eventos**, no modifican el store | Separación de presentación y estado |
| 4 | Los componentes `Ui*` **no tienen lógica de dominio** | Son reutilizables entre módulos |
| 5 | Los repositorios usan **`rows<T>()`** y **`row<T>()`** | Centraliza el cast desde `any[]` |
| 6 | **`packages/shared`** es la fuente de verdad de permisos y roles | Backend y frontend nunca se desincronían |
| 7 | Las migraciones SQL son **numeradas e inmutables** después de aplicarse | Garantiza estado reproducible de la BD |

## Estructura del frontend (`frontend/src/`)

| Directorio | Responsabilidad |
|---|---|
| `api/` | Instancia axios con interceptores de auth, refresh automático y enriquecimiento de errores |
| `assets/` | `main.css` — sistema de diseño completo en CSS custom properties |
| `components/ui/` | 32 componentes del design system (`Ui*`) — sin lógica de dominio |
| `components/features/` | Componentes de dominio por módulo (tablas, cards, badges específicos) |
| `composables/` | Lógica reutilizable: paginación, tablas, modales, formularios, async |
| `constants/` | Permisos, roles, brand — re-exportan `packages/shared` |
| `directives/` | `v-permission` para ocultar elementos sin permiso |
| `layouts/` | `AuthenticatedLayout.vue` (app post-login), `AuthLayout.vue` (páginas públicas) |
| `router/` | `index.ts` — rutas + navigation guards de autenticación, permisos y tenant |
| `services/` | Una clase por recurso API (llaman a `apiClient`) |
| `stores/` | 5 stores Pinia: auth, company, branch, member, audit |
| `types/` | Interfaces TypeScript por entidad |
| `utils/` | Helpers de error, texto, fechas, tokens, contraseñas |
| `views/` | Una view por ruta/página — orquestan composables, stores y componentes |

## Estructura del backend (`backend/src/`)

| Directorio / Archivo | Responsabilidad |
|---|---|
| `auth/` | JWT, refresh tokens, registro, sesión, cambio de contraseña |
| `members/` | CRUD de usuarios por empresa |
| `company/` | Empresas multi-tenant, creación, actualización |
| `branches/` | Sedes (ubicaciones) por empresa |
| `rbac/` | Roles y permisos configurables por empresa |
| `audit/` | Interceptor global + logs con paginación por cursor |
| `email/` | Brevo API → SMTP → stub |
| `two-factor/` | Tipos para 2FA (TOTP) |
| `common/config/` | Validación de variables de entorno con Joi |
| `common/constants/` | Permisos y roles (espejo de `packages/shared`) |
| `common/decorators/` | `@Public`, `@RequirePermissions`, `@Roles`, `@CurrentUser`, `@Audit` |
| `common/dto/` | DTOs compartidos: `PaginationQueryDto`, `buildOrderBy` |
| `common/filters/` | `SentryExceptionFilter` (global, captura 5xx) |
| `common/guards/` | JWT, CompanyAccess, Permissions, Roles, SuperAdmin |
| `common/middleware/` | `RequestLoggerMiddleware` (pino JSON) |
| `common/types/` | `db-rows.ts` — interfaces de filas SQL |
| `common/utils/` | `db.ts`, `sql.helper.ts`, `transaction.helper.ts` |
| `migrations/` | SQL versionado 000–017 |
| `main.ts` | Bootstrap NestJS: Sentry, CORS, ValidationPipe, Swagger |

## Flujo de una request típica

```
1. Browser envía: POST /api/companies/branches
   Headers: Authorization: Bearer <token>, x-company-id: <uuid>

2. Guards (en orden):
   ThrottlerGuard     → ¿demasiados requests?
   JwtAuthGuard       → ¿token válido y no en blacklist?
   PasswordChangedGuard → ¿debe cambiar contraseña?
   CompanyAccessGuard → ¿usuario pertenece a la empresa del header?

3. Controller: @RequirePermissions('branches:create')
   PermissionsGuard verifica el permiso

4. Service: lógica de negocio

5. Repository: SQL crudo tipado con rows<T>()

6. AuditLogInterceptor: registra la acción automáticamente

7. Respuesta: { success: true, data: Branch, message: 'Sede creada' }
```
