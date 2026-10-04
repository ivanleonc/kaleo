# API — Roles y Permisos

Roles: `/api/roles` · Permisos: `/api/permissions`

Todos los endpoints requieren `Bearer token` + `x-company-id`.

---

## `GET /api/permissions`

Lista todos los permisos disponibles en el sistema.

**Roles:** Owner, Admin, Viewer

**Respuesta `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "users:read",
      "name": "Ver miembros",
      "module": "users"
    },
    {
      "id": "uuid",
      "code": "branches:create",
      "name": "Crear sedes",
      "module": "branches"
    }
  ]
}
```

---

## `GET /api/roles`

Lista todos los roles de la empresa (sistema + personalizados).

**Roles:** Owner, Admin, Viewer

**Respuesta `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Owner",
      "description": "Control total",
      "color": null,
      "is_system": true,
      "company_id": null,
      "permissions": [...]
    },
    {
      "id": "uuid",
      "name": "Gestor de Ventas",
      "description": "Acceso a facturas y clientes",
      "color": "#8b5cf6",
      "is_system": false,
      "company_id": "uuid-empresa",
      "permissions": [...]
    }
  ]
}
```

---

## `GET /api/roles/:id`

Retorna un rol con su lista completa de permisos.

**Roles:** Owner, Admin, Viewer

---

## `POST /api/roles`

Crea un rol personalizado para la empresa.

**Roles:** Owner, Admin

**Body:**

```json
{
  "name": "Gestor de Ventas",
  "description": "Puede ver y crear facturas",
  "color": "#8b5cf6",
  "permissionIds": ["uuid-perm-1", "uuid-perm-2"]
}
```

| Campo | Requerido | Descripción |
|---|---|---|
| `name` | ✅ | Nombre único en la empresa |
| `description` | — | Descripción del rol |
| `color` | — | Color hexadecimal (`#8b5cf6`). Se valida el formato. |
| `permissionIds` | — | UUIDs de permisos a asignar |

---

## `PUT /api/roles/:id/permissions`

Reemplaza **todos** los permisos de un rol.

**Roles:** Owner únicamente

**Body:**

```json
{
  "permissionIds": ["uuid-perm-1", "uuid-perm-3", "uuid-perm-5"]
}
```

---

## `PUT /api/roles/:id`

Actualiza nombre, descripción, color y/o permisos de un rol personalizado.

**Roles:** Owner, Admin

**Body (todos opcionales):**

```json
{
  "name": "Nuevo Nombre",
  "description": "Nueva descripción",
  "color": "#ef4444",
  "permissionIds": ["uuid-perm-1"]
}
```

::: warning Roles del sistema
No se pueden modificar los roles `Owner`, `Admin` y `Viewer`. Son roles del sistema (`is_system: true`).
:::

---

## `DELETE /api/roles/:id`

Elimina un rol personalizado (soft delete).

**Roles:** Owner únicamente

::: danger
Al eliminar un rol, los miembros que lo tenían asignado pierden esos permisos inmediatamente. Los JWT activos siguen siendo válidos hasta que expiran (máx 15 min).
:::

::: warning Anti-IDOR
El backend verifica que el rol pertenezca a la empresa del `x-company-id`. No se pueden eliminar roles de otras empresas aunque se conozca el UUID.
:::
