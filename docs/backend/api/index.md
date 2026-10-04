# API REST — Convenciones

## URL base

Todos los endpoints están bajo `/api`. En desarrollo local: `http://localhost:3000/api`.

## Autenticación

Todos los endpoints requieren un **Bearer JWT** en el header `Authorization`, salvo los marcados como públicos (`@Public`):

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Los tokens de acceso expiran en **15 minutos**. Usa `POST /api/auth/refresh` para obtener un nuevo par de tokens.

## Header multi-tenant

Los endpoints de recursos requieren el identificador de la empresa activa:

```http
x-company-id: 550e8400-e29b-41d4-a716-446655440000
```

**Endpoints que requieren `x-company-id`:** members, branches, roles, permissions, audit.

**Endpoints que NO lo requieren:** auth, companies (gestión de empresas propias).

## Formato de respuesta

### Éxito — recurso único

```json
{
  "success": true,
  "data": { "id": "...", "name": "..." },
  "message": "Empresa actualizada correctamente"
}
```

### Éxito — lista paginada (offset)

```json
{
  "success": true,
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### Éxito — lista paginada (cursor)

```json
{
  "success": true,
  "data": [...],
  "nextCursor": "eyJpZCI6IjEyMyIsImNyZWF0ZWRfYXQiOiIifQ==",
  "hasNext": true,
  "limit": 20
}
```

### Error

```json
{
  "statusCode": 403,
  "message": "No tienes permiso para realizar esta acción",
  "error": "Forbidden"
}
```

## Parámetros de paginación

| Parámetro | Tipo | Default | Máximo | Descripción |
|---|---|---|---|---|
| `page` | number | `1` | — | Página (solo paginación offset) |
| `limit` | number | `20` | `100` | Items por página |
| `sortBy` | string | — | — | Campo de ordenamiento |
| `sortDir` | `asc` \| `desc` | `asc` | — | Dirección del ordenamiento |

## Códigos HTTP

| Código | Significado |
|---|---|
| `200` | Éxito |
| `201` | Recurso creado |
| `400` | Request inválido (validación fallida, header faltante) |
| `401` | No autenticado o token expirado |
| `403` | Sin permiso para esta acción |
| `404` | Recurso no encontrado |
| `409` | Conflicto (email duplicado, slug en uso) |
| `422` | Entidad inválida (reglas de negocio) |
| `429` | Rate limit excedido |
| `500` | Error interno del servidor |

## Rate limiting

| Endpoint | Límite |
|---|---|
| Global | 30 requests/min por IP |
| `POST /auth/login` y `POST /auth/register` | 5 req/60s |
| `POST /auth/forgot-password` y `POST /auth/reset-password` | 3 req/60s |
| `POST /auth/verify-email` | 10 req/60s |

## Swagger UI

Cuando el backend corre con `SWAGGER_ENABLED=true`:

- **URL:** `http://localhost:3000/api/docs`
- **Autenticación:** Basic Auth (credenciales en `SWAGGER_USER`/`SWAGGER_PASSWORD`)
- **JSON:** `http://localhost:3000/api/docs-json`

::: warning
Swagger se habilita solo en `development`. En producción debe estar desactivado (`SWAGGER_ENABLED=false`).
:::

## Headers en cada request (resumen)

```http
GET /api/companies/branches HTTP/1.1
Host: localhost:3000
Authorization: Bearer <access_token>
x-company-id: <company_uuid>
Content-Type: application/json
```
