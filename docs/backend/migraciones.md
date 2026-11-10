# Migraciones SQL

Kaleo gestiona el esquema con **archivos SQL versionados**. El runner `backend/scripts/run-migrations.ts` los aplica en orden, registra cada versión en `public.schema_migrations` y guarda un checksum SHA-256 para detectar ediciones posteriores.

## Ambientes

| Ambiente | Archivo de entorno | Base de datos | Uso |
|---|---|---|---|
| Desarrollo | `backend/.env.development` | `kaleo-dev` | Desarrollo diario |
| Staging | `backend/.env.staging` | `kaleo-staging` | Validar antes de producción |
| Producción | `backend/.env.production` | `kaleo-prod` | Clientes reales |

Regla: **development → staging → production**. Nunca aplicar primero en producción.

## Convención de nombres

```text
NNN-descripcion-kebab-case.sql
```

- `NNN` es correlativo y no se reutiliza.
- El número `001` no existe; el baseline es `000` y los deltas empiezan en `002`.
- El nombre completo del archivo es la versión que se guarda en `schema_migrations`.

## Comandos del runner

Desde `backend/`:

```bash
# Ver estado (aplicadas, pendientes y checksums)
npm run migrate -- development --status
npm run migrate -- staging --status
npm run migrate -- production --status

# Aplicar todas las pendientes
npm run migrate -- development
npm run migrate -- staging
npm run migrate -- production

# Aplicar solo una migración pendiente por prefijo
npm run migrate -- staging 017

# Registrar checksums que falten (no modifica migraciones)
npm run migrate -- production --backfill-checksums

# Aceptar una edición intencional de una migración ya aplicada
npm run migrate -- production --accept-checksum 000
```

### Cómo funciona el checksum

- Al aplicar una migración se guarda el SHA-256 del archivo.
- `--status` muestra `✓` si coincide, `? checksum sin registrar` si falta y `! checksum distinto` si cambió.
- Si hay un checksum distinto, el runner **no aplica nada** hasta restaurar el archivo o aceptar la edición de forma explícita.
- `--accept-checksum <prefijo>` solo debe usarse para fixes documentados del baseline. No es un atajo para editar migraciones aplicadas.

## Migraciones actuales

| Archivo | Descripción |
|---|---|
| `000-baseline-schema.sql` | Esquema completo inicial. Re-ejecutable e idempotente. |
| `002-add-auth-improvements.sql` | Columnas de auth, refresh tokens, blacklist e historial de contraseñas. |
| `003-add-rbac-permissions.sql` | Permisos base y roles Owner/Admin. |
| `004-seed-permissions-roles.sql` | Seed completo: Owner/Admin/Viewer y 28 permisos. |
| `005-expand-audit-action-column.sql` | Amplía `audit_logs.action` a 255 caracteres. |
| `006-create-branches-table.sql` | Tabla de sedes. |
| `007-add-permission-name.sql` | Nombre legible en permisos. |
| `008-add-audit-response-columns.sql` | `response_status`, `response_data`, `duration_ms`. |
| `009-add-audit-indexes.sql` | Índices de auditoría. |
| `010-cleanup-audit-response-bloat.sql` | Limpia `response_data` de GET/OPTIONS/HEAD. |
| `011-extended-profile-fields.sql` | Campos extendidos de perfil, empresa, sedes y roles. |
| `012-add-missing-indexes.sql` | Índices faltantes de rendimiento. |
| `013-add-audit-keyset-index.sql` | Índice keyset para paginación por cursor. |
| `014-backfill-company-slugs.sql` | Rellena slugs de empresas existentes. |
| `015-add-email-verification-expiry.sql` | Expiración de verificación de email. |
| `016-cleanup-orphan-user-contexts.sql` | Limpia contextos con roles borrados. |
| `017-add-super-admin-flag.sql` | Flag `users.is_super_admin`. |
| `018-create-analyses-table.sql` | Tabla `analyses` del pack energía. |
| `019-seed-analyses-permissions.sql` | Permisos `analyses:*` y asignación a Owner/Admin/Viewer. |
| `020-create-feature-flags.sql` | Feature flags por empresa (`feature_flags`). |
| `021-rls-pilot.sql` | Rol `kaleo_app` sin `BYPASSRLS`, grants y política RLS piloto en `branches`. |
| `022-fix-rls-empty-setting.sql` | Corrige la política cuando `app.company_id` está vacío o no definido. |
| `023-company-id-unique.sql` | `UNIQUE (company_id, id)` en tablas padre para futuras FKs compuestas. |
| `024-create-invitations.sql` | Invitaciones por email (`invitations`, `invitation_roles`). |
| `025-outbox-and-audit-fields.sql` | Outbox transaccional y columnas de trazabilidad en auditoría. |
| `026-create-memberships.sql` | Memberships, membership_roles y membership_branches + backfill. |
| `027-sync-user-contexts-memberships.sql` | Triggers de sincronización desde `user_contexts`. |
| `028-rls-all-tables.sql` | Políticas RLS completas para tablas de negocio. |
| `029-drop-user-contexts.sql` | Elimina `user_contexts` y los triggers de sincronización. |
| `030-membership-token-version.sql` | `memberships.token_version` para invalidar claims por empresa. |
| `031-role-name-unique.sql` | Names de rol únicos por empresa (case-insensitive) y para globales. |
| `032-users-email-unique-ci.sql` | Email de usuario único sin distinguir mayúsculas. |
| `033-refresh-token-families.sql` | Familias de refresh tokens para detectar reuso. |
| `034-company-slug-active-unique.sql` | Slug de empresa único solo entre activas. |
| `035-refresh-token-session-metadata.sql` | IP, user-agent y último uso en refresh tokens. |
| `036-refresh-token-family-default.sql` | Default de `family_id` para inserciones durante el despliegue. |
| `037-permissions-namespace.sql` | Migra permisos a `core.*` e invalida claims para refrescar. |
| `038-remove-ghost-permissions.sql` | Elimina permisos sin endpoints reales. |
| `039-app-runtime-roles.sql` | Crea `kaleo_runtime` y `kaleo_auth` para separar runtime de auth. |
| `040-module-registry.sql` | Catálogo de módulos, dependencias y habilitación por empresa. |
| `041-plans-entitlements.sql` | Planes, suscripciones, overrides y contadores de uso. |
| `042-core-plan-analyses-limit.sql` | Límite mensual de creación de análisis en el plan core. |
| `043-company-settings.sql` | Preferencias regionales por empresa y trigger de alta. |

## Verificar el estado

```sql
SELECT version, checksum, applied_at
FROM public.schema_migrations
ORDER BY version;
```

Debe haber una fila por archivo aplicado, sin checksums nulos y sin versiones extra.

## Reglas importantes

::: danger No editar migraciones aplicadas
Una migración registrada en `schema_migrations` no se edita. Crea una nueva con el número siguiente.

**Excepción documentada:** el baseline `000` puede corregirse si el fix es necesario para instalaciones limpias. En ese caso:
1. Documentar el motivo en la cabecera del archivo.
2. Verificar que el cambio es no-op en las bases existentes.
3. Ejecutar `--accept-checksum 000` en cada ambiente.
:::

::: tip `000` es especial
`000-baseline-schema.sql` usa `CREATE TABLE IF NOT EXISTS` y guards. En una base limpia se ejecuta `000` y luego `002..019` en orden. El runner lo hace automáticamente.

Nota: los guards de constraints deben calificar por esquema/tabla. Supabase tiene `auth.users_pkey` y `auth.refresh_tokens_pkey`; un guard global por `conname` se salta las PK de `public` y rompe las FK.
:::

## `audit_logs` — tabla particionada

`audit_logs` está particionada por rango de fecha:

- `audit_logs_y2026h2` (julio-diciembre 2026)
- `audit_logs_y2027` (año 2027)
- `audit_logs_default` (overflow)

::: warning
Al modificar `audit_logs` con `ALTER TABLE`:
- Los cambios van **solo en la tabla padre** (`audit_logs`).
- Nunca ejecutes `ALTER TABLE audit_logs_y2026h2` directamente.
- Los nuevos registros se insertan automáticamente en la partición correcta.
:::

Agregar una partición nueva:

```sql
CREATE TABLE audit_logs_y2028
PARTITION OF audit_logs
FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');
```

## Rollback

Las migraciones son aditivas. Para revertir un cambio:

1. Restaurar el backup más reciente verificado.
2. O crear una migración nueva que revierta el cambio de forma controlada.

No se hace `DROP TABLE` en producción sin backup y ventana explícita. El procedimiento de backup y restore está en [`backups.md`](./backups.md).
