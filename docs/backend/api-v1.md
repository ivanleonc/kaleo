# API v1 e idempotencia

## Alias `/api/v1`

Los endpoints actuales viven en `/api`. Para no duplicar controllers, el
backend reescribe:

```text
/api/v1/modules  ->  /api/modules
```

- `/api/v1/*` responde con `X-API-Version: 1`.
- `/api/*` sigue funcionando para clientes existentes.
- Ambos comparten autenticación, guards, RLS y auditoría.

## Idempotency-Key

Cualquier `POST` JSON puede enviar:

```http
Idempotency-Key: 8f14e45f-ceea-467a-9a3b-1f2d3c4b5a69
```

Reglas:

- 8–128 caracteres: alfanumérico, `.`, `_`, `:`, `-`.
- La clave es por empresa + usuario.
- El scope es método + path.
- Se guarda 24 horas.
- Mismo path + mismo body → se reproduce la respuesta guardada.
- Mismo path + body distinto → `409 IDEMPOTENCY_KEY_REUSED`.
- Misma clave mientras la primera request sigue en proceso → `409 IDEMPOTENCY_IN_PROGRESS`.
- Si la operación falla, la clave se libera para permitir reintento.
- No aplica a `multipart/form-data` ni a GET.

La respuesta reproducida incluye:

```http
Idempotency-Replayed: true
Idempotency-Key: <clave>
```

## Uso recomendado

- POST financieros.
- Creación de entidades con riesgo de doble submit.
- Imports/exports asíncronos.
- Cualquier endpoint donde el cliente pueda reintentar por timeout.

## Migración

`048-idempotency-keys.sql` crea la tabla con RLS y TTL.
La retención diaria elimina claves expiradas.
