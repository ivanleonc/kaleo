# API — Miembros

Base: `/api/companies/users`

Todos los endpoints requieren `Bearer token` + `x-company-id`.

---

## `GET /api/companies/users`

Lista paginada de miembros de la empresa activa.

**Permiso:** `users:read`

**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `page` | number | Página (default: 1) |
| `limit` | number | Items/página (default: 20, máx: 100) |
| `search` | string | Busca en nombre y email |
| `status` | `active` \| `inactive` | Filtra por estado |
| `roleId` | UUID | Filtra por rol |
| `sortBy` | `name` \| `email` \| `created_at` \| `status` | Columna de sort |
| `sortDir` | `asc` \| `desc` | Dirección |

**Respuesta `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Ana García",
      "email": "ana@empresa.com",
      "roles": ["Admin"],
      "status": "active",
      "phone": "+57 300 000 0000",
      "position": "Gerente",
      "avatar_url": null,
      "must_change_password": false,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

---

## `POST /api/companies/users`

Agrega un miembro a la empresa. Si el email no existe, crea la cuenta con contraseña temporal y la envía por email.

**Permiso:** `users:create`

**Body:**

```json
{
  "name": "Nuevo Miembro",
  "email": "nuevo@empresa.com",
  "roleIds": ["uuid-rol-1"],
  "phone": "+57 300 000 0000",
  "position": "Desarrollador",
  "document_type": "CC",
  "document_number": "12345678"
}
```

**Respuesta `201`:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Nuevo Miembro",
    "email": "nuevo@empresa.com",
    "isNewUser": true
  },
  "message": "Miembro agregado. Contraseña temporal enviada a nuevo@empresa.com"
}
```

`isNewUser: false` cuando el email ya existía en el sistema (solo se vincula, sin enviar contraseña).

---

## `PATCH /api/companies/users/:userId`

Actualiza datos del miembro en la empresa activa.

**Permiso:** `users:update`

**Body (todos opcionales):**

```json
{
  "roleIds": ["uuid-rol-nuevo"],
  "status": "inactive",
  "phone": "+57 310 000 0000",
  "position": "Senior Developer",
  "document_type": "CC",
  "document_number": "87654321"
}
```

---

## `POST /api/companies/users/:userId/reset-password`

Genera una nueva contraseña temporal (sin enviar email). Devuelve la contraseña en la respuesta para que el admin la comparta manualmente.

**Permiso:** `users:update`

**Respuesta `200`:**

```json
{
  "success": true,
  "data": { "temporaryPassword": "Temp2024XY" }
}
```

---

## `POST /api/companies/users/:userId/reset-password-email`

Genera una nueva contraseña temporal Y la envía automáticamente al email del usuario.

**Permiso:** `users:update`

---

## `DELETE /api/companies/users/:userId`

Quita al usuario de la empresa activa (soft detach — no borra la cuenta).

**Permiso:** `users:delete`

::: warning
No se puede eliminar al único Owner de una empresa.
:::

---

## `GET /api/companies/users/search`

Busca usuarios por nombre o email. Usado para autocompletar en el modal de asignación multi-empresa.

**Permiso:** `users:create` · Query: `?q=ana` (mínimo 2 caracteres)

**Respuesta `200`:**

```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Ana García", "email": "ana@empresa.com" }
  ]
}
```

---

## `GET /api/companies/users/:userId/companies`

Lista todas las empresas a las que pertenece un usuario (con sus roles en cada una).

**Permiso:** `users:read`

**Respuesta `200`:**

```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Empresa A", "slug": "empresa-a", "roles": ["Owner"] },
    { "id": "uuid", "name": "Empresa B", "slug": "empresa-b", "roles": ["Viewer"] }
  ]
}
```

---

## `POST /api/companies/:id/members`

Asigna un usuario existente a una empresa específica (puede ser diferente de la activa).

**Permiso:** `users:create` · El header `x-company-id` debe coincidir con `:id`

**Body:**

```json
{
  "userId": "uuid-usuario-existente",
  "roleNames": ["Admin"],
  "phone": "+57 300 000 0000"
}
```

---

## `DELETE /api/companies/:id/members/:userId`

Quita un usuario de una empresa específica.

**Permiso:** `users:delete` · El header `x-company-id` debe coincidir con `:id`
