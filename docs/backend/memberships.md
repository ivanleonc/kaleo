# Memberships

> **Estado:** modelo creado, backfill ejecutado y sincronización activa.
> **Fuente de verdad actual:** `user_contexts`. `memberships` es un espejo sincronizado hasta completar la migración de código.

## Modelo objetivo

```text
memberships (1 por user/company)
  ├── membership_roles (N roles)
  └── membership_branches (N sedes)
```

| Tabla | Columnas clave |
|---|---|
| `memberships` | `id`, `company_id`, `user_id`, `status`, `joined_at`, timestamps |
| `membership_roles` | `company_id`, `membership_id`, `role_id` |
| `membership_branches` | `company_id`, `membership_id`, `branch_id` |

Reglas:

- `UNIQUE (company_id, user_id)` en memberships.
- `UNIQUE (company_id, id)` para FKs compuestas.
- `status`: `invited`, `active`, `inactive`.
- `membership_branches` usa FK compuesta a `branches (company_id, id)`: la sede debe ser de la misma empresa.
- RLS por `company_id` en las tres tablas.

## Backfill

La migración `026-create-memberships.sql` copia el modelo plano:

- Una membership por `(company_id, user_id)`.
- Un rol por cada `user_contexts.role_id`.
- Una sede por cada `user_contexts.branch_id` no nulo.

## Sincronización temporal

Mientras la app sigue escribiendo `user_contexts`, la migración `027-sync-user-contexts-memberships.sql` añade triggers `AFTER INSERT OR DELETE`:

- INSERT: crea/usa la membership e inserta rol y sede.
- DELETE: elimina el rol/sede si ya no queda otra fila con el mismo valor; si no quedan roles, elimina la membership.

Limitación: no se manejan `UPDATE` directos de `role_id`/`branch_id`. La app actual borra e inserta filas, así que no ocurre. Si se añade un `UPDATE`, habrá que extender el trigger.

## Smoke test

```bash
npm run smoke:memberships -- staging
```

Crea un usuario con dos roles y una sede, valida el espejo, elimina un rol y luego todos. Hace `ROLLBACK`.

Resultado esperado:

```text
RESULTADO: memberships + triggers OK
```

## Fases de migración

1. ✅ Crear tablas, backfill y triggers de sincronización.
2. Migrar lecturas de auth/sesión/guards a memberships (`RegistrationService`, `SessionService`, `CompanyAccessGuard`, `RbacService`).
3. Migrar repositorios de miembros/roles/sedes y el detalle de auditoría.
4. Cambiar escrituras a memberships; eliminar triggers y `user_contexts`.
5. Diseñar RLS de `users`/`companies` basada en memberships y pasar la app a `kaleo_app`.

## Reglas mientras dure la transición

- No escribir directamente en `memberships` desde código de negocio; usar el modelo plano hasta la fase 2–3.
- No eliminar `user_contexts` ni los triggers.
- Cualquier cambio en `user_contexts` debe probarse con `smoke:memberships`.
- No añadir `UPDATE` directos a `user_contexts` sin actualizar el trigger.
