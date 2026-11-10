# RLS: piloto y adopción

> **Estado:** piloto validado en staging el 10 de noviembre de 2026.
> **Alcance:** rol `kaleo_app`, política de `branches` y smoke test.
> **Regla:** la aplicación sigue conectando como `postgres` (con `BYPASSRLS`) hasta completar el rollout.

## Por qué

RLS está habilitado en todas las tablas, pero sin políticas. Eso da falsa seguridad: la aplicación conecta como `postgres`, que tiene `BYPASSRLS`, así que ninguna política se aplica. El objetivo es:

1. Tener un rol de aplicación sin `BYPASSRLS`.
2. Definir políticas por `company_id`.
3. Pasar la aplicación a ese rol solo cuando todas sus consultas funcionen con contexto.

## Rol `kaleo_app`

La migración `021-rls-pilot.sql` crea:

```sql
CREATE ROLE kaleo_app NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
```

- `NOLOGIN`: por ahora se usa con `SET ROLE` desde `postgres` para pruebas.
- Sin `BYPASSRLS`: las políticas sí se aplican.
- Grants sobre `public`, tablas, secuencias, funciones y default privileges.

Para la aplicación real se creará un rol con login y password en el gestor de secretos.

## Política piloto

```sql
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches FORCE ROW LEVEL SECURITY;

CREATE POLICY branches_tenant_isolation ON public.branches
  USING (
    company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
  )
  WITH CHECK (
    company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
  );
```

`NULLIF(..., '')` es obligatorio: si el GUC se define y luego se resetea, `current_setting` devuelve `''`, y `''::uuid` lanza error. Con `NULLIF`, la comparación es `NULL` y no devuelve filas.

## Cobertura de políticas

| Tabla | Regla |
|---|---|
| `branches`, `analyses`, `feature_flags`, `audit_logs` | `company_id = app.company_id` |
| `invitations`, `invitation_roles` | `company_id = app.company_id` |
| `outbox_events` | `company_id = app.company_id` |
| `memberships`, `membership_roles`, `membership_branches` | `company_id = app.company_id` |
| `roles` | globales (`company_id IS NULL`) o de la empresa actual |
| `role_permissions` | el rol es global o de la empresa actual |
| `permissions` | catálogo global, solo lectura |
| `users` | el usuario actual o alguien con membership activa en la empresa actual |
| `companies` | la empresa actual o una empresa donde el usuario tiene membership activa |

Validación integral:

```bash
npm run smoke:rls:all -- staging
```

En CI, el job `db-isolation` levanta PostgreSQL 16, ejecuta
`npm run db:bootstrap-ci`, aplica todas las migraciones desde cero y corre
`smoke:rls:all`, `smoke:tenant`, `smoke:memberships` y `smoke:outbox` contra
`DATABASE_URL`/`.env.ci`.

Crea dos empresas con datos de varios módulos, cambia a `kaleo_app` con contexto de A y verifica que no vea nada de B. Sin contexto, las tablas por empresa devuelven 0 filas.

> **Importante:** la aplicación sigue conectando como `postgres` (`BYPASSRLS`). Las políticas están listas, pero no se aplican hasta cambiar la `DATABASE_URL` a `kaleo_app`.

## Pilot de transacción con RLS

`withTenantTransaction` ahora:

1. Abre una transacción.
2. Ejecuta `SET LOCAL ROLE kaleo_app`.
3. Setea `app.company_id` y, si existe, `app.user_id`.
4. Ejecuta el callback con el `QueryRunner`.
5. Hace commit/rollback y libera la conexión.

Repositorios migrados:

- `FeatureFlagsRepository`
- `BranchesRepository`
- `AnalysisRepository`
- `MemberRepository` (lecturas y CRUD de miembros)
- `RoleRepository` (CRUD y catálogo de roles)
- `InvitationsRepository` (administración; la aceptación pública queda en auth)
- `AuditLogRepository` (listado, exportación y tipos de entidad)
- `CompanyRepository` (`findById` y `update`; slug y super-admin quedan privilegiados)

La app sigue conectando como `postgres`, pero dentro de esas transacciones actúa como `kaleo_app`, por lo que RLS se aplica.

### Criterio de migración

| Tipo de consulta | Rol | Motivo |
|---|---|---|
| CRUD de negocio con `companyId` | `kaleo_app` vía `withTenantTransaction` | Debe respetar RLS |
| Login, refresh, claims, búsqueda de usuario por email/id | `postgres` | Ocurre antes de tener contexto de empresa |
| Validaciones de roles y chequeos de auth | `postgres` | No son lecturas de negocio del tenant |
| Onboarding/creación de empresa y usuario nuevo | `postgres` | Necesita crear filas antes de que exista membership |
| Vistas cross-company de super-admin | `postgres` | Acceso administrativo explícito |

Regla: una consulta de negocio que no pase por `withTenantTransaction` sigue sin RLS. Por eso la migración es incremental y cada repositorio migrado debe tener tests.

### Excepciones documentadas

| Consulta | Motivo |
|---|---|
| `PermissionRepository.findAll/findByIds/findByModule` | Catálogo global (`permissions` tiene política de solo lectura `USING (true)`), no es dato de tenant |
| `CompanyRepository.findBySlug` | Debe ver slugs de otros tenants para validar unicidad; también se usa en onboarding sin contexto |
| `CompanyRepository.getAllCompanies` | Vista cross-company de super-admin |
| `AuditLogRepository.log` / `insert` | Lo escribe el interceptor en el camino privilegiado; la auditoría atómica usa el `QueryRunner` de la transacción de negocio |
| `MemberRepository.addMember`, `isAlreadyMember`, búsquedas de usuario | Creación de usuario nuevo y validaciones de auth/onboarding |

Validación:

```bash
npm run smoke:tenant -- staging
```

Comprueba que el contexto A solo vea sus flags, que el upsert en A funcione y que leer/escribir B quede bloqueado.

## Cómo se ejecuta

Dentro de una transacción:

```sql
BEGIN;
SELECT set_config('app.company_id', '<uuid>', true);
-- queries de la empresa
COMMIT;
```

- `set_config(..., true)` es local a la transacción.
- Con el pooler en modo transaction, `SET LOCAL`/`set_config(..., true)` es lo correcto; no usar `SET` de sesión.
- Sin `app.company_id`, las políticas fallan cerradas (0 filas).

## Smoke test

```bash
npm run smoke:rls -- staging
```

Crea dos empresas y dos sedes en una transacción, cambia a `kaleo_app`, valida:

- Empresa A solo ve su sede.
- Empresa B solo ve la suya.
- Sin contexto: 0 filas.
- INSERT cross-tenant: bloqueado por RLS.

Al terminar hace `ROLLBACK`: no deja datos.

Resultado esperado:

```text
RESULTADO: RLS OK
```

## `TenantContext` y transacciones

Ya existen las piezas base:

- `backend/src/common/tenancy/tenant-context.service.ts`: `AsyncLocalStorage` con `requestId`, `userId`, `companyId` e `isSuperAdmin`.
- `tenant-context.middleware.ts`: inicializa el contexto por request, después del logger.
- `company-access.guard.ts`: publica `companyId` y `userId` en el contexto, valida la membership activa y compara `token_version` con los claims.
- `tenant-transaction.ts`: `withTenantTransaction(dataSource, tenantContext, fn)` abre una transacción, ejecuta `set_config('app.company_id', $1, true)`, corre el callback con el `QueryRunner` y hace commit/rollback.

Los repositorios de negocio reciben `companyId` explícito y lo validan contra el `TenantContext` antes de abrir la transacción. Las consultas de auth/onboarding y las vistas cross-company siguen en `postgres` según la tabla de excepciones.

## Conexión runtime y auth

La app puede separar dos conexiones:

| Variable | Rol | Uso |
|---|---|---|
| `DATABASE_URL` | `postgres` | Migraciones y scripts administrativos |
| `DATABASE_APP_URL` | `kaleo_runtime` | Pool por defecto: RLS sin `BYPASSRLS` |
| `DATABASE_AUTH_URL` | `kaleo_auth` | Login, onboarding, auditoría y outbox |

`kaleo_runtime` hereda los grants de `kaleo_app`; sin `app.company_id` las
consultas de negocio fallan cerradas. `kaleo_auth` tiene `BYPASSRLS` y solo se
inyecta en repositorios/guards de auth, auditoría y outbox.

Activación:

1. Aplicar `039-app-runtime-roles.sql`.
2. Configurar contraseñas:

```bash
DATABASE_URL=<admin> \
KALEO_RUNTIME_PASSWORD=... \
KALEO_AUTH_PASSWORD=... \
npm run db:set-app-passwords
```

3. Definir `DATABASE_APP_URL` y `DATABASE_AUTH_URL` en el hosting.
4. Reiniciar el backend y validar login, onboarding, miembros, auditoría y outbox.
5. Rollback: quitar ambas variables; la app vuelve a usar `DATABASE_URL`.

> `DATABASE_URL` sigue siendo la conexión administrativa de migraciones/scripts.
> No la cambies al rol runtime.

## Rollout pendiente

1. ✅ Políticas para todas las tablas de negocio.
2. ✅ Pilot de `withTenantTransaction` + `SET LOCAL ROLE kaleo_app` en feature flags.
3. ✅ Migrar los repositorios de negocio a `withTenantTransaction`.
4. ✅ DataSource `auth` separado con rol `kaleo_auth` (BYPASSRLS).
5. ✅ Crear roles de login `kaleo_runtime` y `kaleo_auth` (`039`).
6. Activar en producción: contraseñas, `DATABASE_APP_URL`/`DATABASE_AUTH_URL`, reinicio y validación.

El código ya funciona sin las variables nuevas (fallback a `DATABASE_URL`). La
activación es reversible quitando `DATABASE_APP_URL` y `DATABASE_AUTH_URL`.
