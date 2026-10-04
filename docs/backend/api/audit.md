# API — Auditoría

Base: `/api/audit`

Todos los endpoints requieren `Bearer token` + `x-company-id` + permiso `audit:read`.

## Por qué paginación por cursor

La tabla `audit_logs` puede tener millones de registros. La paginación por offset (`LIMIT 20 OFFSET 200000`) es lenta en tablas grandes porque el motor debe contar y saltar registros. El cursor (keyset pagination) evita esto:

```sql
-- Offset: lento
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20 OFFSET 200000

-- Cursor: siempre rápido con el índice correcto
SELECT * FROM audit_logs WHERE created_at < $cursor ORDER BY created_at DESC LIMIT 20
```

---

## `GET /api/audit/logs`

Lista de eventos de auditoría con paginación por cursor.

**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `limit` | number | Items por página (default: 20, máx: 100) |
| `cursor` | string | Cursor de la página anterior (opaco, base64) |
| `entityType` | string | Filtrar por tipo de entidad (`Member`, `Branch`, `Role`, etc.) |
| `action` | string | Buscar en la acción (`POST /api/auth/login`, etc.) |
| `userId` | UUID | Filtrar por usuario |
| `from` | ISO date | Desde esta fecha |
| `to` | ISO date | Hasta esta fecha |

**Respuesta `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action": "POST /api/companies/users",
      "entity_type": "Member",
      "entity_id": "uuid-miembro",
      "user_id": "uuid-usuario",
      "user_name": "Ana García",
      "user_email": "ana@empresa.com",
      "old_values": null,
      "new_values": {
        "name": "Nuevo Miembro",
        "email": "nuevo@empresa.com"
      },
      "response_status": 201,
      "response_data": { "success": true },
      "duration_ms": 145,
      "ip_address": "192.168.1.1",
      "created_at": "2026-06-15T14:30:00Z"
    }
  ],
  "nextCursor": "eyJpZCI6InV1aWQiLCJjcmVhdGVkX2F0IjoiMjAyNi0wNi0xNVQxNDozMDowMFoifQ==",
  "hasNext": true,
  "limit": 20
}
```

### Navegar páginas

```
Primera página: GET /api/audit/logs?limit=20
Siguiente página: GET /api/audit/logs?limit=20&cursor=<nextCursor>
```

Para ir a la página anterior, el **frontend mantiene una pila de cursores** (`cursorStack` en `audit.store.ts`). El backend no gestiona navegación hacia atrás.

---

## `GET /api/audit/logs/export`

Exporta los logs filtrados como archivo CSV.

**Mismos query params** que `/logs` (excepto `cursor` y `limit`).

**Respuesta:** Archivo CSV descargable.

```http
Content-Type: text/csv
Content-Disposition: attachment; filename="audit-export.csv"
```

Columnas del CSV: `id`, `created_at`, `action`, `entity_type`, `user_name`, `user_email`, `response_status`, `ip_address`.

---

## `GET /api/audit/entity-types`

Lista los tipos de entidad distintos presentes en los logs de la empresa (para el dropdown de filtros).

**Respuesta `200`:**

```json
{
  "success": true,
  "data": ["Member", "Branch", "Role", "Company", "Auth", "Permission"]
}
```

---

## Estructura de `AuditLog`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador del evento |
| `action` | string | `"MÉTODO /ruta"` — ej: `"POST /api/auth/login"` |
| `entity_type` | string | Tipo de entidad afectada |
| `entity_id` | UUID | ID del registro afectado |
| `user_id` | UUID \| null | Usuario que realizó la acción |
| `user_name` | string \| null | Nombre en el momento de la acción |
| `user_email` | string \| null | Email en el momento |
| `old_values` | object \| null | Valores antes del cambio (en updates) |
| `new_values` | object \| null | Valores enviados en el request |
| `response_status` | number | HTTP status de la respuesta |
| `response_data` | object \| null | Respuesta sanitizada (sin datos sensibles) |
| `duration_ms` | number | Tiempo de procesamiento en ms |
| `ip_address` | string \| null | IP del cliente |
| `created_at` | ISO 8601 | Timestamp del evento |

::: tip Datos sanitizados
Los campos `password`, `password_hash`, `refreshToken`, `token` y similares son **redactados automáticamente** (`[REDACTED]`) antes de guardarse en `new_values`/`old_values`.
:::
