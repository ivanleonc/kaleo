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
- `company-access.guard.ts`: publica `companyId` y `userId` en el contexto cuando valida `x-company-id`.
- `tenant-transaction.ts`: `withTenantTransaction(dataSource, tenantContext, fn)` abre una transacción, ejecuta `set_config('app.company_id', $1, true)`, corre el callback con el `QueryRunner` y hace commit/rollback.

Los repositorios existentes siguen recibiendo `companyId` explícito. La migración a `withTenantTransaction` será incremental, empezando por las tablas con RLS.

## Rollout pendiente

1. Extender políticas a tablas con `company_id`: `branches`, `analyses`, `feature_flags`, `audit_logs`.
2. Diseñar políticas especiales para `users`, `companies`, `user_contexts` y `roles` (login y memberships ocurren antes de tener contexto de empresa).
3. Migrar los repositorios de las tablas con RLS a `withTenantTransaction`.
4. Crear el rol de login de la aplicación y migrar la `DATABASE_URL`.
5. Probar con `kaleo_app` en staging antes de producción.

No cambiar la conexión de la aplicación a `kaleo_app` hasta completar los pasos 1–4.
