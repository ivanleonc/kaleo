# Jobs queue

> **Estado:** cola genérica equivalente a `pg-boss`, sobre PostgreSQL.
> Usa el mismo pooler y no agrega una dependencia externa.

## Modelo

Tabla `jobs`:

| Columna | Uso |
|---|---|
| `company_id` | Tenant |
| `queue` | Nombre lógico (`email.send`, `import.process`, ...) |
| `payload` | JSONB |
| `status` | `pending`, `running`, `completed`, `dead_letter` |
| `run_at` | Cuándo puede ejecutarse |
| `attempts` / `max_attempts` | Reintentos |
| `locked_at` / `locked_by` | Worker que lo tomó |
| `last_error` | Último error |
| `completed_at` | Fin |

- RLS por `company_id`.
- Índice parcial para pendientes.
- Lock expirado > 10 minutos se devuelve a `pending`.

## Encolar

Dentro de una transacción de negocio:

```ts
await jobs.enqueue(
  {
    companyId,
    queue: 'email.send',
    payload: { to, subject, html },
  },
  queryRunner,
);
```

Sin `queryRunner` usa el DataSource `auth` (privilegiado).

## Worker

`JobsWorker` ejecuta `runPending()` cada 5 segundos.

- Reclama con `FOR UPDATE SKIP LOCKED`.
- Marca `running` antes de ejecutar.
- Ejecuta el handler dentro de un `TenantContext` con `company_id` del job (y `user_id` si viene en el payload).
- Ejecuta el handler registrado para la cola.
- Éxito → `completed`.
- Fallo → backoff 5s, 10s, 20s… hasta 300s.
- Agotar `max_attempts` → `dead_letter`.

## Handlers incluidos

| Cola | Acción |
|---|---|
| `email.send` | Envía `{ to, subject, html }` por `EmailService` |
| `export.generate` | Genera CSV/XLSX de members, branches, analyses o audit |
| `report.generate` | Genera reporte de análisis |
| `import.branches` | Crea sedes desde filas JSON |

Ver `operations.md` para endpoints y ciclo de vida.

## Pendiente

- Productores reales para imports masivos de otras entidades.
- Migrar envíos de email existentes a `email.send` cuando convenga.
- Endpoint/admin para ver pendientes y reintentar dead-letter.
- Métricas de profundidad y latencia por cola.
- Mover el worker a un proceso separado si el volumen crece.
- Retención configurable: `OPERATIONS_RETENTION_DAYS` (7) y `JOBS_RETENTION_DAYS` (30).

## Migración

`045-jobs-queue.sql` crea la tabla y políticas RLS.
Aplicar antes del deploy del backend.
