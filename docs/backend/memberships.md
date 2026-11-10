# Memberships

> **Estado:** `memberships` es la única fuente de verdad desde la migración `029`.
> `user_contexts` fue eliminado; los triggers de sincronización ya no existen.

## Modelo

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
- Borrar una membership elimina en cascada sus roles y sedes.

## Backfill histórico

La migración `026-create-memberships.sql` copió el modelo plano:

- Una membership por `(company_id, user_id)`.
- Un rol por cada `user_contexts.role_id`.
- Una sede por cada `user_contexts.branch_id` no nulo.

La migración `027` mantuvo el espejo con triggers mientras la aplicación
escribía ambos modelos. Esa etapa terminó con `029-drop-user-contexts.sql`.

## Escrituras

`upsertMembershipWithRoles` (`backend/src/common/utils/membership.helper.ts`)
es la única escritura del modelo de acceso:

- Hace upsert de `memberships` por `(company_id, user_id)` y la reactiva si estaba inactiva.
- Inserta los roles en `membership_roles`.
- No toca `membership_branches`; las sedes se asignan aparte.

Se usa en creación de empresa, alta/adjuntar miembro, actualización de roles y
aceptación de invitaciones. La baja de miembro elimina la membership y deja que
las FKs limpien roles y sedes.

## Alcance por sede

`membership_branches` es opt-in por usuario:

| Estado | Comportamiento |
|---|---|
| Sin sedes asignadas | El miembro ve todas las sedes de la empresa |
| Con sedes asignadas | Solo ve y opera sobre esas sedes |
| Owner/Admin | Siempre todas las sedes |

Reglas:

- `BranchRepository.getBranchScope` resuelve el alcance en una transacción de tenant.
- La lista, exportación y detalle de sedes aplican el filtro.
- Actualizar/eliminar una sede fuera del alcance responde `404`.
- La asignación se hace con `PUT /api/companies/users/:userId/branches`.
- Una lista vacía desactiva el alcance para ese usuario.

## Invalidación de claims por empresa

Cada membership tiene `token_version`. El access token incluye
`companyVersions: { [companyId]: number }` y `CompanyAccessGuard` compara ese
valor contra `memberships.token_version` antes de permitir la request.

- Al cambiar roles se incrementa la versión de esa membership.
- Al cambiar permisos de un rol se incrementa la versión de todos los miembros
  con ese rol en la empresa.
- Al reactivar una membership se incrementa la versión.
- Al eliminar o desactivar una membership, el guard la bloquea de inmediato.
- Si la versión no coincide, el guard responde `401`: el cliente refresca el
  access token y recibe los claims actuales **de esa empresa**. Las sesiones en
  otras empresas no se revocan.
- `removeMember` ya no llama a `revokeAllForUser`; el bloqueo es por membership.

> **Orden de despliegue de `030`:** aplicar la migración **antes** de desplegar
> este backend. El código nuevo consulta `memberships.token_version`; si la
> columna no existe, las requests con `x-company-id` fallan.

## Smoke test

```bash
npm run smoke:memberships -- staging
```

Crea una membership con dos roles y una sede, valida el alta, elimina un rol,
elimina la membership y comprueba el borrado en cascada. Hace `ROLLBACK`.

Resultado esperado:

```text
RESULTADO: memberships OK
```

## Fases de migración

1. ✅ Crear tablas, backfill y triggers de sincronización.
2. ✅ Migrar lecturas a memberships:
   - `CompanyRepository.getUserCompanies`, `verifyUserBelongsToCompany`, `getAllCompanies`.
   - `RoleRepository.getUserAccess`.
   - `MemberRepository.getMembersByCompany`, `findForExport`, `getMemberCompanies`, `isAlreadyMember`, `searchUsers`.
3. ✅ Migrar escrituras:
   - `upsertMembershipWithRoles` escribe `memberships` + `membership_roles`.
   - Creación de empresa, alta/adjuntar miembro, actualización de roles, aceptación de invitación y baja de miembro usan memberships.
   - `removeMember` elimina la membership; la baja de rol limpia `membership_roles`.
   - `audit-log.interceptor` y chequeos de Owner usan memberships.
4. ✅ Eliminar escrituras/lecturas legacy, quitar triggers y borrar `user_contexts` (`029`).
5. ✅ RLS de `users`/`companies` basada en memberships.
6. Pendiente: pasar la conexión principal a `kaleo_app` con un camino de auth separado.

> **Orden de despliegue de `029`:** primero el backend que solo usa
> memberships, luego la migración destructiva. Si se aplica antes, el backend
> anterior seguirá intentando escribir en `user_contexts` y fallará.

## Validación

`npm run smoke:outbox -- staging` crea una empresa y verifica en la misma corrida:

- 1 membership,
- 1 rol,
- auditoría y evento outbox.

## Reglas

- No escribir `memberships` desde código de negocio: usar `upsertMembershipWithRoles`.
- No volver a introducir un modelo plano paralelo.
- Cualquier cambio en el modelo debe probarse con `smoke:memberships` y los tests de repositorio.
