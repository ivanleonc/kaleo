# API — Sedes

Base: `/api/companies/branches`

Todos los endpoints requieren `Bearer token` + `x-company-id`.

---

## `GET /api/companies/branches`

Lista paginada de sedes de la empresa activa.

**Permiso:** `branches:read`

**Query params:**

| Param | Descripción |
|---|---|
| `page`, `limit` | Paginación estándar |
| `search` | Busca en nombre y ciudad |
| `status` | `active` \| `inactive` |
| `sortBy` | `name` \| `city` \| `is_active` \| `created_at` |
| `sortDir` | `asc` \| `desc` |

**Respuesta `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "name": "Sede Principal Bogotá",
      "code": "BOG-01",
      "address": "Calle 123 #45-67",
      "city": "Bogotá",
      "state": "Cundinamarca",
      "country": "Colombia",
      "postal_code": "110111",
      "phone": "+57 1 234 5678",
      "email": "bogota@empresa.com",
      "is_active": true,
      "is_main": true,
      "manager_user_id": "uuid",
      "manager_name": "Ana García",
      "timezone": "America/Bogota",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-06-15T10:00:00Z"
    }
  ],
  "total": 8,
  "page": 1,
  "limit": 20
}
```

---

## `POST /api/companies/branches`

Crea una nueva sede.

**Permiso:** `branches:create`

**Body:**

```json
{
  "name": "Sede Medellín",
  "code": "MED-01",
  "address": "Carrera 43A #1-50",
  "city": "Medellín",
  "state": "Antioquia",
  "country": "Colombia",
  "postal_code": "050001",
  "phone": "+57 4 444 5555",
  "email": "medellin@empresa.com",
  "manager_user_id": "uuid-del-responsable",
  "timezone": "America/Bogota"
}
```

| Campo | Requerido |
|---|---|
| `name` | ✅ |
| `code` | — |
| `address`, `city`, `state`, `country`, `postal_code` | — |
| `phone`, `email` | — |
| `manager_user_id` | — (UUID de un miembro de la empresa) |
| `timezone` | — (ej: `America/Bogota`) |

---

## `PATCH /api/companies/branches/:branchId`

Actualiza una sede (todos los campos son opcionales).

**Permiso:** `branches:update`

**Body:** Mismos campos que en `POST`, más:

```json
{
  "is_active": false,
  "is_main": true
}
```

::: warning `is_main`
Solo puede haber una sede principal por empresa. Al marcar `is_main: true`, la sede que tenía ese flag lo pierde automáticamente.
:::

---

## `DELETE /api/companies/branches/:branchId`

Elimina una sede (soft delete — establece `deleted_at`).

**Permiso:** `branches:delete`

::: danger
No se puede eliminar una sede marcada como `is_main = true`. Primero asigna otra sede como principal.
:::
