# Operaciones asíncronas

> **Estado:** exports, reportes e imports de sedes encolan jobs reales.
> El resultado se consulta y descarga por API.

## Modelo

Tabla `operations`:

| Columna | Uso |
|---|---|
| `company_id` / `user_id` | Tenant y creador |
| `kind` | `export`, `report`, `import` |
| `resource` | `members`, `branches`, `analyses`, `audit`, `analyses_summary`, `branches` |
| `format` | `csv`, `xlsx` o NULL |
| `status` | `pending`, `processing`, `ready`, `failed` |
| `data` | Archivo generado (bytea) |
| `result` | Resumen de imports |
| `error` | Error de la operación |

RLS por `company_id`. Cada operación solo es visible para su creador.

## Endpoints

```http
POST /api/operations/exports/members
POST /api/operations/exports/branches
POST /api/operations/exports/analyses
POST /api/operations/exports/audit
POST /api/operations/reports/analyses
POST /api/operations/imports/branches
POST /api/operations/imports/branches/file
GET  /api/operations
GET  /api/operations/:id
GET  /api/operations/:id/download
x-company-id: <uuid>
```

El import por archivo acepta multipart con campo `file` (CSV o XLSX, máximo
10 MB y 500 filas). Encabezados aceptados: `name`/`nombre`, `city`/`ciudad`,
`address`/`direccion`, `state`/`departamento`, `country`/`pais`,
`postal_code`/`codigo_postal`, `phone`/`telefono`, `email`, `code`/`codigo`,
`timezone`/`zona_horaria`.

Body de export/reporte:

```json
{
  "format": "xlsx",
  "columns": ["name", "email"],
  "filters": { "search": "ana" },
  "sortBy": "name",
  "sortDir": "asc"
}
```

Body de import de sedes:

```json
{
  "rows": [
    { "name": "Sede Norte", "city": "Medellín", "code": "NTE" }
  ]
}
```

Máximo 500 filas. Cada fila se procesa de forma independiente; el resultado
incluye `created`, `failed` y los errores.

## Flujo

1. El endpoint crea una fila en `operations`.
2. Encola `export.generate`, `report.generate` o `import.branches`.
3. `JobsWorker` toma el job.
4. El handler genera el archivo o procesa las filas.
5. La operación queda `ready` o `failed`.
6. El cliente consulta `GET /api/operations/:id` y descarga si está lista.

## Permisos

| Endpoint | Permiso |
|---|---|
| Export members | `core.users.read` |
| Export branches | `core.branches.read` |
| Export analyses / report | `core.analyses.read` |
| Export audit | `core.audit.read` |
| Import branches | `core.branches.create` |

## Retención

`JobsRetentionService` corre cada 24h:

| Dato | Variable | Default |
|---|---|---|
| Operaciones `ready`/`failed` | `OPERATIONS_RETENTION_DAYS` | 7 días |
| Jobs `completed`/`dead_letter` | `JOBS_RETENTION_DAYS` | 30 días |

La UI de **Operaciones** lista, solicita, hace polling y descarga los artefactos.

## Migración

`046-operations.sql` crea la tabla y sus políticas RLS.
`047-retention-indexes.sql` agrega índices de limpieza.
