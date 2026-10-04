# Migraciones SQL

Kaleo gestiona el esquema de base de datos con **archivos SQL versionados** aplicados manualmente en el SQL Editor de Supabase.

## Convención de nombres

```
NNN-descripcion-kebab-case.sql
```

Ejemplos:
- `000-baseline-schema.sql`
- `010-add-audit-log.sql`
- `017-add-super-admin-flag.sql`

## Migraciones actuales

| Archivo | Descripción |
|---|---|
| `000-baseline-schema.sql` | Esquema completo inicial. **Re-ejecutable** (usa `CREATE TABLE IF NOT EXISTS`). |
| `002-add-soft-delete.sql` | Agrega `deleted_at` a las tablas principales |
| `003-add-user-context.sql` | Tabla `user_contexts` para membresías multi-empresa |
| `004-seed-permissions-roles.sql` | Datos iniciales de permisos y roles del sistema |
| `005-add-refresh-tokens.sql` | Tabla de refresh tokens |
| `006-add-token-blacklist.sql` | Blacklist de access tokens revocados |
| `007-add-password-history.sql` | Historial de contraseñas (últimas 3) |
| `008-add-company-slug.sql` | Campo `slug` en `companies` |
| `009-add-email-verification.sql` | Tabla de verificación de email |
| `010-add-audit-log.sql` | Tabla `audit_logs` particionada |
| `011-add-branch-fields.sql` | Campos adicionales en `branches` |
| `012-add-user-profile-fields.sql` | Campos de perfil en `users` |
| `013-add-schema-migrations.sql` | Tabla `schema_migrations` para tracking |
| `014-add-user-timezone.sql` | Campo `timezone` en `users` |
| `015-add-email-verification-expiry.sql` | Expiración de tokens de verificación |
| `016-add-pending-email.sql` | Campo `pending_email` para cambio de email pendiente |
| `017-add-super-admin-flag.sql` | Campo `is_super_admin` en `users` |

## Aplicar migraciones

### Opción A — SQL Editor de Supabase (recomendado)

1. Abre tu proyecto en [supabase.com/dashboard](https://supabase.com/dashboard)
2. Ve a **SQL Editor**
3. Copia el contenido del archivo de migración
4. Ejecuta

**Orden obligatorio:** 000 → 002 → 003 → ... (siempre de menor a mayor)

### Opción B — Runner automatizado

```bash
# Ver estado (qué está aplicado, qué está pendiente)
npm run migrate -- development --status

# Aplicar todas las pendientes
npm run migrate -- development

# Aplicar solo una migración específica
npm run migrate -- development --only 017-add-super-admin-flag.sql
```

El runner usa la tabla `schema_migrations` para saber qué ya fue aplicado.

## Verificar estado

```sql
SELECT version FROM schema_migrations ORDER BY version;
```

Debe retornar una fila por cada migración aplicada.

## Crear una nueva migración

### 1. Nombrar el archivo

```
018-descripcion-del-cambio.sql
```

Usa el número siguiente al último archivo existente.

### 2. Escribir el SQL

```sql
-- 018-add-invoices.sql

-- Tabla nueva
CREATE TABLE IF NOT EXISTS invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  number      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft',
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(company_id, status);

-- Registrar en schema_migrations
INSERT INTO schema_migrations (version) VALUES ('018');
```

### 3. Probar en development

Siempre aplica primero en `kaleo-dev`. Nunca en producción directamente.

## Reglas importantes

::: danger No editar migraciones aplicadas
Una vez que una migración está en `schema_migrations`, **nunca la edites**. Crea una nueva migración con el número siguiente para corregir o extender.
:::

::: tip `000` es especial
La migración `000-baseline-schema.sql` usa `CREATE TABLE IF NOT EXISTS` en todos lados. Puedes ejecutarla en una base de datos nueva sin errores — es idempotente.
:::

## `audit_logs` — tabla particionada

La tabla `audit_logs` es una **tabla particionada por rango de fecha** (PostgreSQL range partitioning). Tiene particiones:
- `audit_logs_y2026h2` (julio-diciembre 2026)
- `audit_logs_y2027` (año completo 2027)
- `audit_logs_default` (overflow)

::: warning
Al modificar `audit_logs` con `ALTER TABLE`:
- Los cambios van **solo en la tabla padre** (`audit_logs`), no en las particiones
- Nunca ejecutes `ALTER TABLE audit_logs_y2026h2` directamente
- Los nuevos registros se insertan automáticamente en la partición correcta
:::

Agregar una nueva partición para 2028:

```sql
CREATE TABLE audit_logs_y2028
PARTITION OF audit_logs
FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');
```
