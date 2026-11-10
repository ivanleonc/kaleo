# Estado actual de Kaleo

> **Tipo:** auditoría técnica read-only.
> **Fecha:** 9 de noviembre de 2026.
> **Alcance:** repositorio `kaleo`, código fuente actual y backup de base de datos `saas.sql`.
> **Restricciones respetadas:** no se modificó código fuente, no se ejecutaron migraciones, no se instalaron dependencias y no se cambiaron configuraciones.
> **Naturaleza:** diagnóstico, no implementación.

---

## 1. Resumen ejecutivo

Kaleo es hoy una **plataforma SaaS administrativa multiempresa** con una base técnica superior a la media para su tamaño: autenticación completa, JWT con refresh, 2FA, RBAC, auditoría, sedes, un design system consistente, CI y documentación. Su núcleo administrativo es reutilizable para una plataforma con múltiples verticales.

Sin embargo, **no es todavía una plataforma de negocio**: el único vertical implementado es una demo de analítica energética y no existen proyectos, APUs, presupuestos, catálogo, proveedores, inventario, mano de obra, costos, CRM ni planes/suscripciones.

Antes de incorporar verticales, Kaleo debe resolver tres problemas estructurales:

1. **Aislamiento multi-tenant**: hoy depende de la aplicación y la base de datos no puede garantizarlo.
2. **Semántica de membership**: “inactivar” o eliminar a un miembro afecta a todas sus empresas; no existen invitaciones ni estado por empresa.
3. **Auditoría y trazabilidad**: la auditoría se escribe fuera de la transacción de negocio y puede perderse o registrar operaciones que hicieron rollback.

La conclusión es directa: **Kaleo está preparado para evolucionar, pero no para multiplicar datos de negocio sobre el modelo actual sin una fase previa de hardening**.

---

## 2. Método y evidencia

### 2.1 Fuentes inspeccionadas

- Estructura completa del repositorio y manifests (`package.json`, `turbo.json`, `.github/workflows/ci.yml`).
- Backend: módulos, controladores, servicios, repositorios, guards, interceptores, DTOs, migraciones y tests.
- Frontend: router, layouts, vistas, componentes, stores, servicios, API client, utilidades y tests.
- Paquete compartido `packages/shared`.
- Documentación existente en `docs/`.
- Backup `C:\Users\ileon\OneDrive\Documentos\saas.sql`: esquema `public`, constraints, índices, políticas RLS, particiones y datos de muestra.

### 2.2 Niveles de evidencia

| Nivel | Uso en este documento |
|---|---|
| **Verificado en código** | Se leyó el archivo o la definición SQL concreta. |
| **Verificado en backup** | Se observó la estructura o los datos del dump. |
| **Inferido** | Se deduce del comportamiento del código, sin ejecución en producción. |
| **No verificado** | Requiere acceso a producción, métricas, logs o pruebas de carga. |

### 2.3 Limitaciones

- No se ejecutó la aplicación ni pruebas de carga.
- No se accedió a métricas reales de producción, logs, Sentry ni al panel de Supabase.
- No se verificó la ejecución real del servicio de retención de auditoría.
- No se inspeccionó visualmente la aplicación en todos los breakpoints.
- El backup contiene PII, hashes y tokens; debe tratarse como material sensible.

---

## 3. Mapa del repositorio

```text
kaleo/
├── backend/                 API NestJS
│   ├── src/
│   │   ├── auth/            registro, login, refresh, logout, 2FA, passwords
│   │   ├── company/         empresas y tenant
│   │   ├── members/         miembros y asignación a empresas
│   │   ├── branches/        sedes
│   │   ├── rbac/            roles, permisos, role_permissions
│   │   ├── audit/           interceptor, repositorio, exportación, retención
│   │   ├── analyses/        análisis JSONB (hoy energía)
│   │   ├── email/           envío de correos
│   │   ├── two-factor/      TOTP
│   │   ├── common/          guards, filtros, DTOs, export, utils
│   │   └── migrations/      000–019
│   └── test/
├── frontend/                SPA Vue 3
│   └── src/
│       ├── views/           17 vistas
│       ├── components/      layout, features y ~40 componentes UI
│       ├── stores/          auth, company, members, branches, roles, audit, analyses, energy
│       ├── services/        acceso HTTP por dominio
│       ├── composables/     tablas, paginación, formularios, tenant, tema
│       ├── router/          rutas planas
│       ├── api/             axios y cliente de energía
│       └── utils/           tokens, tenant, fechas, CSV, errores
├── packages/shared/         permisos, roles y tipos compartidos
├── docs/                    VitePress
├── scripts/                 verificación de sincronización de permisos
└── turbo.json
```

**Observación:** el repositorio es un monorepo, pero `backend` y `frontend` mantienen instalaciones y scripts independientes. `packages/shared` se consume como código fuente TypeScript.

---

## 4. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Monorepo | Turborepo 2.x, npm scripts |
| Backend | NestJS, TypeORM `DataSource`, SQL crudo, class-validator, Swagger |
| Base de datos | PostgreSQL en Supabase, pooler, `pgcrypto` |
| Frontend | Vue 3, Vite, Pinia, Vue Router, Axios, ECharts, ReKa UI, Tabler Icons |
| Autenticación | JWT, bcrypt, refresh tokens, blacklist, TOTP |
| Observabilidad | Sentry (backend y frontend) |
| Documentación | VitePress |
| CI | GitHub Actions |
| Deploy | Cloudflare Pages (frontend/docs) y Render u host Node (backend) |

**Decisión implícita:** el backend usa SQL crudo con repositorios propios en lugar de entidades TypeORM. Esto da control y transparencia, pero traslada toda la integridad y el aislamiento a la disciplina del código.

---

## 5. Backend

### 5.1 Organización

El backend está dividido por dominios administrativos:

- `auth`: registro, login, refresh, logout, recuperación, cambio de contraseña, perfil, verificación.
- `company`: empresas, onboarding, cambio de empresa.
- `members`: miembros, attach/detach, búsqueda de usuarios, exportación.
- `branches`: CRUD de sedes.
- `rbac`: roles, permisos y asignaciones.
- `audit`: registro, consulta por cursor y exportación.
- `analyses`: análisis persistidos en JSONB.
- `email` y `two-factor`: servicios transversales.

Cada módulo sigue una estructura similar: controlador → servicio → repositorio → SQL. Es una arquitectura consistente y fácil de navegar.

### 5.2 Guards globales

`AppModule` registra como `APP_GUARD`, en este orden:

1. `ThrottlerGuard` (30 requests/minuto global).
2. `JwtAuthGuard`.
3. `PasswordChangedGuard`.
4. `CompanyAccessGuard`.

`PermissionsGuard` y `RolesGuard` se aplican por controlador. El interceptor `AuditLogInterceptor` se registra globalmente. El middleware `RequestLoggerMiddleware` se aplica a todas las rutas y genera el request-id.

**Fortaleza:** el orden fail-closed es correcto: primero autenticación, luego cambio de contraseña, luego pertenencia a la empresa.

**Limitación:** `CompanyAccessGuard` valida el header, pero no impone que cada query incluya `company_id`; eso queda a cargo de cada repositorio.

### 5.3 Bootstrap y seguridad de plataforma

`main.ts` implementa:

- Validación temprana de `JWT_SECRET`, `DATABASE_URL` y `CORS_ORIGIN`.
- `helmet` con CSP desactivada globalmente (Swagger la necesita).
- CORS restringido a orígenes explícitos con credenciales.
- `ValidationPipe` con `whitelist` y `transform`.
- Filtro global de excepciones con Sentry.
- Graceful shutdown.
- Swagger apagado por defecto en producción y protegido con Basic Auth cuando se habilita.
- Límite de body de 2 MB.
- `trust proxy` para IP real detrás de Render/Cloudflare.

**Fortaleza:** hay conciencia explícita de seguridad y operación. **Riesgo:** CSP desactivada globalmente; debería configurarse de forma estricta para la API y relajarse solo en la ruta de Swagger.

### 5.4 Manejo de errores

- Excepciones NestJS (`BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`).
- Filtro global `SentryExceptionFilter` para 5xx.
- Respuestas de error consistentes en JSON.
- En frontend, `enrichAxiosError` agrega contexto y mensajes.

**Limitación:** no hay catálogo central de códigos de error de negocio; los mensajes son legibles pero difíciles de consumir por integraciones.

---

## 6. Frontend

### 6.1 Arquitectura

- Vue 3 con Composition API y `<script setup>`.
- Pinia para sesión, empresa, tablas y estado de UI.
- Vue Router con rutas planas bajo `/companies/:companyId/...`.
- Axios con inyección de `x-company-id`, refresh single-flight y enriquecimiento de errores.
- Design system propio con ~40 componentes `Ui*`.
- ECharts para visualizaciones.
- `AuthenticatedLayout`, `AppTopbar`, `AppSidebar`, `UiOfflineBanner`.

### 6.2 Tenant en el frontend

- La URL acepta slug o UUID; se canonicaliza a slug.
- El header siempre envía el UUID.
- El tenant activo se guarda en Pinia y `localStorage`, y se reconcilia con la URL.
- `resolveTenantByParam`, `companyPathFor` y `tenantUrlParam` encapsulan la lógica.

**Fortaleza:** la resolución es explícita y contempla enlaces legacy. **Riesgo:** triple fuente de verdad (URL, Pinia, `localStorage`) que puede desincronizarse; ya existe lógica de “heal”, lo que evidencia el problema.

### 6.3 Navegación

`AppSidebar` contiene enlaces manuales a Dashboard, Analítica, Miembros, Sedes, Roles, Auditoría y Configuración. El router mantiene una lista plana de rutas con `requiredPermission`.

**Riesgo:** agregar 10 módulos multiplicará el mantenimiento manual y el drift entre router, sidebar, permisos y planes.

### 6.4 Estado y servicios

- Servicios por dominio (`member.service`, `branch.service`, `role.service`, etc.).
- Stores Pinia con acciones y estado de paginación.
- `createPaginatedStore` existe como factory, pero no todos los stores lo usan.
- `useListQueryState`, `useAppTable`, `useAsyncOperation` y otros composables reducen duplicación, pero el patrón no está totalmente estandarizado.

### 6.5 Analítica energética

- `AnalysesView` lista análisis persistidos.
- `AnalysisDetailView` renderiza el resultado.
- `energy.service` usa un backend externo si `VITE_ENERGY_API_URL` está definida.
- Si no está definida, `energy.mock.ts` genera datos mock en el cliente.
- El backup contiene análisis de energía con clientes, kWh, pérdidas y zonas.

**Conclusión:** energía es una demo/vertical, no el núcleo de una plataforma genérica. No debe usarse como base para APUs ni presupuestos.

---

## 7. Base de datos

### 7.1 Inventario de tablas `public`

| Tabla | Rol | Observaciones |
|---|---|---|
| `users` | Identidad global | Email único parcial, `is_super_admin`, `locked_until`, perfil extendido |
| `companies` | Tenant | `slug` único, soft delete, datos fiscales y de contacto |
| `branches` | Sedes | `is_main` único parcial, dirección, timezone |
| `roles` | Roles | Globales (`company_id NULL`) o por empresa; soft delete |
| `permissions` | Catálogo de permisos | Código único, módulo, nombre |
| `role_permissions` | M:N rol-permiso | PK compuesta |
| `memberships` | Membership por usuario/empresa | Estado `invited/active/inactive`, unique `(company_id, user_id)` |
| `membership_roles` | Roles de la membership | PK `(company_id, membership_id, role_id)` |
| `membership_branches` | Sedes de la membership | FK compuesta a `branches (company_id, id)` |
| `analyses` | Análisis JSONB | Solo energía validada; metadata de archivo |
| `audit_logs` | Auditoría particionada | Particiones `y2026h2`, `y2027` y `default` |
| `password_history` | Historial de hashes | Sin retención explícita |
| `refresh_tokens` | Refresh tokens | Hash, expiración, revocado, familia y rotación |
| `token_blacklist` | Access tokens revocados | Hash único, expiración |

### 7.2 Constraints y relaciones relevantes

- `companies.slug` es único solo entre empresas activas (`deleted_at IS NULL`).
- `users.email` es único solo para filas con `deleted_at IS NULL` y es **case-sensitive**.
- `branches` tiene un unique parcial para una sola sede principal activa por empresa.
- `memberships` tiene unique `(company_id, user_id)` y `(company_id, id)`; las tablas hijas usan FK compuesta y borrado en cascada.
- `roles` no tiene unique de nombre por empresa.
- `role_permissions` tiene PK `(role_id, permission_id)`.
- `audit_logs` tiene PK `(id, created_at)` por particionamiento.
- FKs principales con `ON DELETE CASCADE` desde empresa y con `SET NULL` desde usuarios en auditoría.

### 7.3 Índices

Hay índices razonables para listados y auditoría:

- `idx_analyses_company_created`, `idx_analyses_company_type`.
- `idx_branches_company_id`.
- `idx_roles_company_id`, `idx_roles_name` parcial.
- `idx_memberships_company_status`, `idx_membership_roles_role`, `idx_membership_branches_branch`.
- `idx_users_email` parcial.
- Índices de auditoría por empresa/fecha, entidad y usuario, incluyendo keyset `(company_id, created_at DESC, id DESC)`.
- `uq_branches_main_per_company` parcial para sede principal activa.

### 7.4 RLS

En el backup, las tablas `public` tienen RLS habilitado, pero **no hay políticas `CREATE POLICY` para `public`**. El backend usa una conexión privilegiada. Por tanto, RLS **no aporta defensa en profundidad** hoy y puede dar una falsa sensación de seguridad.

### 7.5 Datos de muestra

El backup contiene análisis de energía con KPIs de clientes, consumo, pérdidas y zonas. No contiene proyectos, presupuestos, APUs, inventario ni datos de construcción.

---

## 8. Autenticación y sesiones

### 8.1 Flujo

- Registro con creación de usuario y empresa.
- Login con email/password.
- Access token JWT de 15 minutos.
- Refresh token de 7 días con rotación.
- Blacklist de access tokens.
- Logout con revocación.
- Recuperación y cambio de contraseña.
- Verificación de email.
- 2FA TOTP.
- Bloqueo tras 5 intentos fallidos durante 15 minutos.
- Expiración de contraseña a 90 días y cambio forzado.

### 8.2 Claims del JWT

El token incluye información de empresas, roles y permisos por empresa. Esto permite autorización sin consultar la BD en cada request, pero introduce dos riesgos:

- **Staleness:** un cambio de rol puede tardar hasta 15 minutos en reflejarse.
- **Tamaño:** un usuario con muchas empresas puede generar un token grande.

### 8.3 Almacenamiento en frontend

`TokenService` guarda access y refresh tokens en `localStorage`. Es simple y funciona con la arquitectura actual, pero expone ambos tokens a XSS. El refresh token en `localStorage` es especialmente sensible.

### 8.4 Fortalezas

- Hash bcrypt.
- Historial de contraseñas.
- 2FA.
- Bloqueo por intentos.
- Verificación de email.
- Swagger protegido.
- CORS explícito.
- Helmet.

### 8.5 Debilidades

- Tokens en `localStorage`.
- CSP desactivada globalmente.

---

## 9. Multi-tenancy y memberships

### 9.1 Modelo actual

- `users` es global.
- `companies` es el tenant.
- `memberships` relaciona usuario y empresa con estado; `membership_roles` y `membership_branches` añaden roles y sedes.
- `CompanyAccessGuard` valida en `memberships` que el usuario pertenezca a la empresa del header.
- Los repositorios filtran por `company_id`.

> Varios problemas de la sección 9.2 ya se resolvieron: `searchUsers` filtra por empresa, las invitaciones existen y el modelo `user_contexts` fue reemplazado por `memberships` (`029`).

### 9.2 Problemas

1. **Búsqueda global de usuarios:** `MemberRepository.searchUsers` busca en todos los usuarios, lo que permite enumerar nombres y emails de otras empresas.
2. **Sedes no aplicadas:** `branch_id` se guarda, pero guards y queries no lo usan como filtro.
3. **Borrado de sede en cascada:** borrar una sede elimina la membership completa.
4. **Inactivación global:** `locked_until = NOW() + 100 years` bloquea al usuario en todas las empresas.
5. **Remoción global:** eliminar un miembro revoca todos sus refresh tokens, no solo los de la empresa.
6. **Duplicados (resuelto):** `memberships` tiene unique `(company_id, user_id)`; las asignaciones ya no se duplican.
7. **Sin invitaciones:** se adjunta un usuario existente por ID o se crea uno nuevo; no hay consentimiento ni expiración.

---

## 10. RBAC

### 10.1 Modelo

- Roles globales (`company_id NULL`) y roles por empresa.
- Permisos con código `module:action`.
- `role_permissions` como M:N.
- `PermissionsGuard` resuelve permisos contra la empresa del header.
- `RolesGuard` resuelve roles contra la empresa del header.
- Owner y roles protegidos tienen reglas especiales.

### 10.2 Fortalezas

- Permisos granulares por módulo.
- Roles custom por empresa.
- Owner protegido.
- Verificación de sincronización de permisos en CI.
- Uso de `@RequirePermissions` y `v-permission` en frontend.

### 10.3 Limitaciones

- Sin scope por sede o proyecto.
- Sin unique de nombre de rol por empresa.
- Borrado de rol en cascada sobre `membership_roles`.
- Staleness de permisos en el JWT.
- Permisos “fantasma” de billing, notifications e integrations sin módulo real.
- Códigos sin namespace de plataforma (`users:read` en lugar de `core.users.read`).

---

## 11. Auditoría

### 11.1 Implementación

`AuditLogInterceptor` captura método, URL, body, usuario, IP, user-agent, estado, duración y valores anteriores/nuevos. `AuditLogService` y `AuditLogRepository` persisten en `audit_logs`. Hay consulta por cursor, exportación y un servicio de retención.

### 11.2 Fortalezas

- Cobertura transversal.
- Antes/después.
- IP y user-agent.
- Particionamiento por fecha.
- Keyset pagination.
- Exportación.

### 11.3 Problemas

- **Fire-and-forget:** se escribe fuera de la transacción de negocio.
- **Rollback inconsistente:** puede registrar una operación que luego falla.
- **Carreras:** old/new se consultan antes/después y pueden reflejar otro cambio.
- **CASCADE:** borrar una empresa elimina su auditoría.
- **`response_data`:** puede almacenar información sensible.
- **Particiones manuales:** solo `y2026h2`, `y2027` y `default`; las filas en `default` pueden bloquear nuevas particiones.
- **Sin `request_id`:** aunque el middleware lo genera, no se observó que se persista en auditoría.

---

## 12. Analítica y energía

- `analyses` almacena `result` y `summary` como JSONB.
- `analysis_type` es texto libre; solo existe validación para `energy`.
- El frontend puede usar un backend externo de energía o generar datos mock.
- El backup contiene datos de energía, no de construcción.
- `AnalysesView` y `AnalysisDetailView` están integrados con permisos `analyses:*`.

**Conclusión:** es un vertical válido para una demo, pero no un modelo para datos transaccionales de construcción. APUs, presupuestos y costos requieren tablas relacionales, versiones y constraints.

---

## 13. API, errores y contratos

### 13.1 API

- Controladores REST con Swagger.
- Header `x-company-id` para endpoints de empresa.
- Envelope `Ok` y `OkPaged`.
- Paginación offset para listados y cursor para auditoría.
- Exportación CSV/Excel tabular.
- Sin versionado `/v1` explícito.
- Sin idempotencia en POST.
- Sin bloqueo optimista.
- Sin códigos de error de negocio centralizados.

### 13.2 Contratos frontend-backend

- Tipos manuales en `frontend/src/types` y `packages/shared`.
- No hay generación automática desde OpenAPI.
- Riesgo de drift entre DTOs, tipos y permisos.

### 13.3 Oportunidades

- OpenAPI como fuente de contratos.
- Tipos generados en CI.
- Envelope de error estándar con `code`, `details`, `requestId`.
- Versionado `/api/v1`.
- Idempotency-Key en operaciones financieras.
- `If-Match`/`version` para concurrencia.

---

## 14. Seguridad

### 14.1 Controles existentes

- Helmet.
- CORS explícito.
- Rate limiting global.
- Validación de DTOs.
- Password hashing.
- 2FA.
- Historial de contraseñas.
- Bloqueo por intentos.
- Swagger protegido.
- Sentry para 5xx.
- Consultas parametrizadas en los repositorios revisados.

### 14.2 Riesgos

| Riesgo | Severidad | Detalle |
|---|---|---|
| Tokens en `localStorage` | Alta | XSS puede robar access y refresh |
| Búsqueda global de usuarios | Alta | Fuga cross-tenant de PII |
| RLS sin políticas | Alta | No hay defensa en profundidad |
| Auditoría no transaccional | Alta | Pérdida o inconsistencia de trazas |
| CSP desactivada | Media | Superficie XSS mayor |
| Backup con PII/tokens | Alta | Debe protegerse y rotarse si se expuso |
| Sin idempotencia | Media | Duplicados en operaciones financieras |
| Sin cifrado de campos sensibles | Media | Depende de Supabase; revisar requisitos |
| Sin política de retención de PII | Media | Password history, auditoría, tokens |

---

## 15. Rendimiento y escalabilidad

### 15.1 Fortalezas

- Backend stateless.
- Pool de conexiones limitado (10) con timeouts.
- Índices por empresa y fecha.
- Paginación.
- Exportación con límite máximo.
- Particionamiento de auditoría.
- CI y build reproducibles.

### 15.2 Riesgos

- Consultas raw sin un query builder centralizado; riesgo de duplicación y SQL no parametrizado en código futuro.
- Sin cache de permisos, planes o catálogos.
- Sin jobs en background para importaciones/reportes.
- Sin idempotencia.
- Sin bloqueo optimista.
- Sin métricas de negocio ni trazas distribuidas.
- JWT grande si el usuario pertenece a muchas empresas.
- Particiones de auditoría manuales.
- RLS sin políticas.
- Sin prueba de carga.

---

## 16. UI/UX y accesibilidad

### 16.1 Fortalezas

- Design system consistente.
- Componentes de tabla, filtros, paginación, modales, formularios, exportación y estados vacíos.
- Layout autenticado con topbar, sidebar, skip link y banner offline.
- Manejo de tema y responsive.
- Mensajes de error y toasts.
- Iconografía consistente.

### 16.2 Limitaciones

- Navegación plana y manual.
- No hay module switcher ni navegación por vertical.
- No hay componentes para grid editable tipo spreadsheet, árbol WBS, Gantt, takeoff o wizard de importación.
- Algunos stores duplican lógica.
- Accesibilidad de componentes complejos sin auditoría formal.
- i18n incompleto; textos hardcodeados en español.

---

## 17. Testing, CI y observabilidad

### 17.1 Tests

- Más de 20 specs backend.
- Más de 40 specs frontend.
- Cobertura de servicios, repositorios, validadores, guards y vistas.
- Tests de auditoría, exportación, permisos y tenant access.

**Faltan:**

- Tests de integración con PostgreSQL real.
- Tests de aislamiento cross-tenant.
- Tests de cálculos financieros.
- Tests de migraciones.
- Tests E2E de flujos críticos.
- Tests de carga.

### 17.2 CI

`.github/workflows/ci.yml` ejecuta typecheck, lint, tests y build en backend y frontend, además de `check:permissions`. El job `db-isolation` levanta PostgreSQL 16, prepara el schema/roles de Supabase, migra desde cero y corre los smoke tests de RLS, tenant, memberships y outbox.

**Faltan:** OpenAPI diff, tests E2E, escaneo de dependencias y análisis estático de seguridad.

### 17.3 Observabilidad

- Sentry backend y frontend.
- Request logger con request-id.
- Filtro de excepciones.
- Sin métricas de latencia, errores por endpoint, pool, colas o negocio.
- Sin dashboards operativos.
- Sin alertas definidas.

---

## 18. Documentación

La documentación VitePress es extensa y cubre arquitectura, backend, frontend, guías y manual de usuario. Sin embargo, está desactualizada en puntos concretos:

- Afirma que `PermissionsGuard` y `RolesGuard` son globales; en el código se aplican por controlador.
- Lista migraciones hasta 017; existen 018 y 019.
- Describe menos stores de los actuales.
- No refleja el cambio de energía a análisis.
- No documenta las limitaciones de tenancy, RLS o auditoría.

**Riesgo:** la documentación transmite una seguridad mayor que la real. Debe actualizarse junto con el hardening.

---

## 19. Hallazgos priorizados

### P0 — Bloqueantes antes de nuevos verticales

| ID | Hallazgo | Evidencia | Impacto | Acción recomendada |
|---|---|---|---|---|
| P0-1 | Búsqueda global de usuarios entre tenants | `MemberRepository.searchUsers` | Fuga de PII, enumeración de usuarios | Invitaciones por email; búsqueda solo en empresa |
| P0-2 | Sedes no aplicadas como frontera | `membership_branches` no usado en guards/queries | Acceso a datos de otra sede | Definir alcance y aplicar filtros o quitar semántica |
| P0-3 | Inactivación/remoción global | `locked_until` y revocación global | Un usuario pierde acceso a todas sus empresas | Membership con estado por empresa y revocación por empresa |
| P0-4 | BD no garantiza aislamiento tenant | FKs independientes, RLS sin políticas | Un bug puede crear vínculos cross-tenant | FKs compuestas, RLS real, tests de aislamiento |
| P0-5 | Auditoría no transaccional | Interceptor fire-and-forget, CASCADE | Trazabilidad financiera incompleta | Auditoría transaccional/outbox y retención |
| P0-6 | Incoherencia de producto | `analyses` JSONB y energía mock | APUs/presupuestos sobre un modelo incorrecto | Separar vertical energía y crear modelo relacional |

### P1 — Riesgos altos

| ID | Hallazgo | Impacto | Acción |
|---|---|---|---|
| P1-1 | Permisos con staleness de 15 min | Cambios de rol tardíos | `token_version` o validación en acciones sensibles |
| P1-2 | Borrado de rol en cascada | Pérdida silenciosa de acceso | Bloquear borrado si está asignado; reasignar |
| P1-3 | Roles homónimos | Ambigüedad operativa | Unique por empresa |
| P1-4 | Tokens en `localStorage` | Robo por XSS | Cookie httpOnly o CSP estricta + memoria |
| P1-5 | Email case-sensitive | Duplicados de identidad | `citext` o unique sobre `lower(email)` |
| P1-6 | Slug soft-deleted bloquea reutilización | Mala experiencia de onboarding | Unique parcial `WHERE deleted_at IS NULL` |
| P1-7 | Sin idempotencia ni concurrencia optimista | Duplicados y lost updates | Idempotency-Key y `version` |
| P1-8 | Sin jobs en background | Importaciones/reportes bloquean requests | Outbox + pg-boss |
| P1-9 | Permisos fantasma | Roles confusos | Implementar o retirar billing/notifications/integrations |
| P1-10 | Router/sidebar manuales | Drift y mantenimiento | Module registry |

### P2 — Deuda y calidad

- Falta de `created_by`/`updated_by`/`version` en la mayoría de tablas.
- Tipos de dinero y moneda inexistentes.
- Tests de integración y cálculos financieros insuficientes.
- Accesibilidad de componentes complejos sin auditar.
- i18n incompleto.
- Documentación desactualizada.
- Backup con PII y tokens debe protegerse.
- Stores y servicios con patrones duplicados.
- Sin catálogo de códigos de error.
- Sin OpenAPI generado como contrato.

---

## 20. Evaluación de madurez

| Dimensión | Nivel | Comentario |
|---|---:|---|
| Núcleo SaaS administrativo | 4/5 | Auth, empresas, miembros, roles, sedes, auditoría y UI |
| Aislamiento multi-tenant | 2.5/5 | Funciona por aplicación; la BD no lo garantiza |
| RBAC | 3/5 | Granular, pero sin scope y con staleness |
| Auditoría | 3/5 | Existe, pero no es transaccional |
| Integridad de BD | 2.5/5 | FKs independientes, sin FKs compuestas, RLS sin políticas |
| Seguridad | 3/5 | Buenas bases; tokens en localStorage y CSP débil |
| Frontend/UX | 4/5 | Design system sólido; navegación manual |
| Dominio de negocio | 0.5/5 | Solo energía demo |
| Planes/billing/límites | 0/5 | No existe |
| Escalabilidad operativa | 3/5 | Stateless, pero sin jobs, cache ni idempotencia |
| Documentación | 2.5/5 | Extensa pero desactualizada |

**Lectura:** Kaleo es un excelente **kernel administrativo en formación**, no una plataforma de negocio completa. La inversión debe ir primero a integridad y kernel, no a pantallas nuevas.

---

## 21. Componentes reutilizables

- Autenticación, sesión, 2FA, recuperación y hash.
- Guards de tenant, permisos y roles.
- RBAC con roles globales y por empresa.
- Sedes, con la semántica corregida.
- `UiDataTable`, `UiFormModal`, `UiExportMenu`, filtros, paginación y toasts.
- `useCompanyPath`, resolución de tenant y persistencia de empresa activa.
- Exportación tabular y cursor pagination.
- CI, permission sync y Sentry.
- `analyses` para el vertical energía, no para APUs.

---

## 22. Limitaciones de esta auditoría

- No se ejecutaron pruebas de carga ni de penetración.
- No se verificó el comportamiento real en producción.
- No se auditaron todos los archivos línea por línea; se priorizaron rutas críticas.
- No se accedió a la plataforma privada de metroKUBIKO.
- No se evaluó el rendimiento real de queries con volúmenes grandes.
- No se verificó la ejecución del servicio de retención de auditoría.

Estas limitaciones están reflejadas en el nivel de evidencia de cada hallazgo y deben considerarse antes de convertir las recomendaciones en migraciones.
