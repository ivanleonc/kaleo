# API — Autenticación

Base: `/api/auth`

Los endpoints de autenticación son **públicos** (no requieren Bearer token) salvo donde se indique.

---

## `POST /api/auth/register`

Crea una cuenta nueva y la primera empresa del usuario.

**Rate limit:** 5 req/60s · Público

**Body:**

```json
{
  "email": "usuario@ejemplo.com",
  "password": "MiPassword123",
  "name": "Nombre Completo",
  "companyName": "Mi Empresa S.A.",
  "taxId": "12345678-9"
}
```

**Respuesta `201`:**

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "name": "..." },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "tenants": [{ "id": "...", "name": "Mi Empresa S.A.", "slug": "mi-empresa" }]
  }
}
```

**Política de contraseña:** mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número.

---

## `POST /api/auth/login`

Inicia sesión con email y contraseña.

**Rate limit:** 5 req/60s · Público

**Body:**

```json
{
  "email": "usuario@ejemplo.com",
  "password": "MiPassword123"
}
```

**Respuesta `200`:**

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "name": "...", "must_change_password": false },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "tenants": [...],
    "companyPermissions": { "<company_id>": ["users:read", "branches:create", ...] },
    "companyRoles": { "<company_id>": ["Owner"] }
  }
}
```

---

## `POST /api/auth/refresh`

Obtiene un nuevo par de tokens usando el refresh token.

**Público**

**Body:**

```json
{
  "refreshToken": "eyJ..."
}
```

**Respuesta `200`:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

## `POST /api/auth/logout`

Revoca la sesión actual. El access token se añade a la blacklist.

**Requiere:** Bearer token

**Body:**

```json
{
  "refreshToken": "eyJ..."
}
```

---

## `GET /api/auth/me`

Retorna el perfil del usuario autenticado con sus tenants y permisos actualizados.

**Requiere:** Bearer token

**Respuesta `200`:** Igual que el login (user + tenants + companyPermissions + companyRoles).

---

## `PUT /api/auth/profile`

Actualiza el perfil del usuario. Si `email` cambia, se envía un email de verificación al nuevo correo.

**Requiere:** Bearer token

**Body:**

```json
{
  "name": "Nuevo Nombre",
  "email": "nuevo@email.com",
  "phone": "+57 300 000 0000",
  "avatar_url": "https://...",
  "position": "CEO",
  "document_type": "CC",
  "document_number": "12345678",
  "timezone": "America/Bogota",
  "locale": "es"
}
```

**Respuesta `200`:** Incluye `pending_email` si el email cambió y está en proceso de verificación.

---

## `POST /api/auth/profile/email/resend`

Reenvía el email de verificación al correo pendiente.

**Requiere:** Bearer token · Sin body

---

## `POST /api/auth/profile/email/cancel`

Cancela el cambio de email pendiente.

**Requiere:** Bearer token · Sin body

---

## `POST /api/auth/verify-email`

Verifica el cambio de email usando el token del enlace.

**Rate limit:** 10 req/60s · Público

**Body:**

```json
{
  "token": "abc123xyz..."
}
```

---

## `POST /api/auth/change-temporary-password`

Permite cambiar la contraseña temporal sin estar bloqueado por `PasswordChangedGuard`.

**Requiere:** Bearer token (`@SkipPasswordChanged`)

**Body:**

```json
{
  "currentPassword": "PasswordTemporal123",
  "newPassword": "NuevaClave2024"
}
```

---

## `POST /api/auth/change-password`

Cambia la contraseña del usuario autenticado.

**Requiere:** Bearer token (`@SkipPasswordChanged`)

**Body:**

```json
{
  "currentPassword": "ClaveActual123",
  "newPassword": "NuevaClave2024"
}
```

---

## `POST /api/auth/forgot-password`

Envía un email con enlace de recuperación (válido 15 minutos).

**Rate limit:** 3 req/60s · Público

**Body:**

```json
{
  "email": "usuario@ejemplo.com"
}
```

::: tip Seguridad
La respuesta siempre es `200 OK` aunque el email no exista — previene enumeración de cuentas.
:::

---

## `POST /api/auth/reset-password`

Restablece la contraseña usando el token del enlace de recuperación.

**Rate limit:** 3 req/60s · Público

**Body:**

```json
{
  "token": "eyJ...",
  "newPassword": "NuevaClave2024"
}
```
