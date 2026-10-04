# API — Empresas

Base: `/api/companies`

---

## `GET /api/companies`

Lista las empresas a las que pertenece el usuario autenticado.

**Requiere:** Bearer token

**Respuesta `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Mi Empresa",
      "slug": "mi-empresa",
      "tax_id": "12345",
      "is_active": true,
      "roles": ["Owner"]
    }
  ]
}
```

---

## `GET /api/companies/all`

Lista **todas** las empresas del sistema con conteo de miembros.

**Requiere:** Bearer token + `SuperAdminGuard` (solo `is_super_admin = true`)

**Respuesta `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Empresa A",
      "slug": "empresa-a",
      "is_active": true,
      "member_count": 12
    }
  ]
}
```

---

## `GET /api/companies/:id/detail`

Retorna los detalles completos de una empresa.

**Requiere:** Bearer token + permiso `company:read` + `x-company-id`

**Respuesta `200`:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Mi Empresa",
    "slug": "mi-empresa",
    "tax_id": "12345",
    "logo_url": "https://...",
    "phone": "+57 1 000 0000",
    "email": "contacto@empresa.com",
    "address": "Calle 123",
    "city": "Bogotá",
    "state": "Cundinamarca",
    "country": "Colombia",
    "postal_code": "110111",
    "timezone": "America/Bogota",
    "is_active": true,
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

---

## `POST /api/companies`

Crea una nueva empresa. El usuario que la crea se convierte automáticamente en Owner.

**Requiere:** Bearer token

**Body:**

```json
{
  "name": "Nueva Empresa S.A.",
  "taxId": "98765432-1",
  "slug": "nueva-empresa"
}
```

| Campo | Requerido | Descripción |
|---|---|---|
| `name` | ✅ | Nombre visible de la empresa |
| `taxId` | — | NIT, RFC, Tax ID u otro identificador fiscal |
| `slug` | — | Identificador en la URL. Se genera desde `name` si no se provee. Solo minúsculas, números y guiones. |

**Respuesta `201`:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Nueva Empresa S.A.",
    "slug": "nueva-empresa"
  },
  "message": "Empresa creada correctamente"
}
```

---

## `PUT /api/companies/:id`

Actualiza los datos de una empresa. Solo el Owner puede modificarla.

**Requiere:** Bearer token + ser Owner de la empresa

**Body (todos opcionales):**

```json
{
  "name": "Empresa Actualizada",
  "taxId": "nuevo-tax",
  "slug": "empresa-actualizada",
  "logoUrl": "https://cdn.ejemplo.com/logo.png",
  "phone": "+57 300 000 0000",
  "email": "nuevo@contacto.com",
  "address": "Nueva dirección 456",
  "city": "Medellín",
  "state": "Antioquia",
  "country": "Colombia",
  "postalCode": "050001",
  "timezone": "America/Bogota"
}
```

::: warning Cambio de slug
Cambiar el slug actualiza la URL de la empresa. Los enlaces anteriores dejan de funcionar. El frontend lo advierte antes de guardar.
:::
