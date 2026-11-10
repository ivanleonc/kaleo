# Outbox y auditoría transaccional

> **Estado:** implementado y probado en staging el 10 de noviembre de 2026.
> **Alcance:** tabla `outbox_events`, publicador periódico y auditoría atómica.

## Outbox

`outbox_events` guarda eventos de dominio para publicarlos de forma asíncrona y reintentable.

| Columna | Uso |
|---|---|
| `event_id` | Identificador idempotente del evento |
| `company_id` | Tenant |
| `aggregate_type` / `aggregate_id` | Entidad de origen |
| `event_type` | Nombre del evento (`company.created`, etc.) |
| `payload` | Datos del evento en JSONB |
| `occurred_at` | Cuándo ocurrió |
| `published_at` | Cuándo se publicó (NULL = pendiente) |
| `attempts` / `last_error` | Reintentos y último error |
| `next_attempt_at` | Próximo intento permitido (backoff) |
| `dead_lettered_at` | Agotó reintentos y requiere revisión |

### Escribir un evento

Dentro de la transacción del cambio de negocio:

```ts
await outbox.enqueue(
  {
    companyId,
    aggregateType: 'Company',
    aggregateId: companyId,
    eventType: 'company.created',
    payload: { companyId, name },
  },
  queryRunner,
);
```

Sin `queryRunner` se escribe fuera de la transacción actual. Para atomicidad, siempre pasar el runner.

### Publicar

`OutboxPublisher` ejecuta `publishPending()` cada 5 segundos.

- Selecciona pendientes con `FOR UPDATE SKIP LOCKED`: seguro con varias instancias.
- Solo toma eventos con `next_attempt_at <= now()`.
- Ejecuta los handlers registrados por `event_type`.
- Marca `published_at` si el handler termina bien.
- Si falla, incrementa `attempts`, guarda `last_error` y programa el próximo intento con backoff exponencial (5s, 10s, 20s… hasta 300s).
- Al llegar a 10 intentos marca `dead_lettered_at`; el evento deja de seleccionarse y requiere revisión manual.

### Handlers

```ts
outbox.registerHandler('company.created', async (event) => {
  // enviar notificación, encolar job, etc.
});
```

Hoy el evento `company.created` se publica sin handler (se marca publicado). Los handlers se añadirán con notificaciones/jobs en fases posteriores.

## Auditoría transaccional

`AuditLogService.logInTransaction(queryRunner, data)` escribe la auditoría con el mismo `QueryRunner` del cambio de negocio. Si la auditoría falla, la transacción hace rollback.

Piloto implementado: creación de empresa.

1. `CompanyRepository.createWithOwner(..., onCreated)` ejecuta el callback dentro de su transacción.
2. El callback escribe `audit_logs` y encola `company.created`.
3. El controller usa `@Audit({ skip: true })` para no duplicar la entrada del interceptor.

### Interceptor

- En mutaciones (`POST/PUT/PATCH/DELETE`), espera la escritura de auditoría antes de responder.
- En GET, no bloquea la respuesta (se mantiene el comportamiento de baja latencia).
- Añade `module_code`, `source`, `request_id`, `actor_type` y `actor_id`.
- La auditoría sigue sin tumbar la respuesta si la escritura falla; para atomicidad real, el servicio debe usar `logInTransaction`.

## Smoke test

```bash
npm run smoke:outbox -- staging
```

Crea una empresa, escribe auditoría y outbox en la misma transacción, publica el evento y limpia todo.

Resultado esperado:

```text
RESULTADO: auditoría transaccional + outbox OK
```

## Retención y operación

- Purgar `outbox_events` publicados con más de 30 días.
- Alertar si hay eventos pendientes con `attempts >= 10`.
- Alertar si la profundidad del outbox crece.
- No guardar PII innecesaria en `payload`.

## Pendiente

- Cola de jobs genérica (`pg-boss` o equivalente) para imports, exports, emails y reportes.
- Handlers reales para eventos de dominio (notificaciones, jobs, webhooks).
- Métricas de profundidad, reintentos y dead-letter.
- Job de limpieza de eventos publicados.
- Endpoint/admin para reintentar dead-letter manualmente.
