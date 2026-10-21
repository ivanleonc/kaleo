# API — Exportaciones

Todas las tablas de la app se pueden descargar en **CSV** o **Excel (.xlsx)**. La generación del archivo vive en el backend (`TabularExportService`), de modo que la exportación incluye **todos los registros que cumplen los filtros**, no solo la página visible.

## Convención común

Todos los endpoints de exportación aceptan los mismos parámetros:

| Param | Valores | Descripción |
|---|---|---|
| `format` | `csv` (default) \| `xlsx` | Formato del archivo |
| `columns` | ids separados por coma | Columnas a exportar. Sin valor: **todas** |

Reglas:

- `columns` es un **whitelist por dominio**: los ids desconocidos se ignoran; si ninguno coincide, el backend responde `400`.
- Si no se envía `columns`, se exportan todas las columnas del recurso.
- El orden y los filtros son los mismos que los del listado correspondiente.
- Límite de **10.000 filas** (`EXPORT_MAX_ROWS`). Si el resultado lo supera, el backend responde `413` con un mensaje para que el usuario aplique filtros.
- La respuesta es el archivo binario con `Content-Disposition: attachment; filename="..."`.

## Endpoints

| Endpoint | Permiso | Columnas |
|---|---|---|
| `GET /api/companies/users/export` | `users:read` | `name`, `email`, `roles`, `status` |
| `GET /api/companies/branches/export` | `branches:read` | `name`, `location`, `contact`, `status` |
| `GET /api/companies/analyses/export` | `analyses:read` | `name`, `analysis_type`, `summary`, `created_at` |
| `GET /api/companies/analyses/:analysisId/critical-zones/export` | `analyses:read` | `zone`, `municipality`, `clients`, `consumption`, `losses`, `losses_pct`, `status` |
| `GET /api/audit/logs/export` | `audit:read` | `created_at`, `user_name`, `user_email`, `action`, `response_status`, `duration_ms`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `user_agent` |

### Ejemplo

```http
GET /api/companies/users/export?format=xlsx&columns=name,email,status HTTP/1.1
Authorization: Bearer <access_token>
x-company-id: 550e8400-e29b-41d4-a716-446655440000
```

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="miembros_2026-01-01.xlsx"
```

## Notas de seguridad

- El CSV aplica la misma defensa que el frontend: los valores que empiezan por `=`, `+`, `-` o `@` se prefijan con `'` para que Excel no los interprete como fórmulas.
- Los nombres de archivo se sanean (sin acentos ni caracteres especiales) y las hojas de Excel se limitan a 31 caracteres.
- Los permisos se validan con el mismo guard que el listado: exportar exige el permiso de lectura del recurso.
