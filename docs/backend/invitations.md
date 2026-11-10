# Invitaciones

> **Estado:** backend implementado y migrado en staging. La UI de aceptación se implementa en el frontend.

## Flujo

1. Un administrador con `core.users.create` invita a un email desde la empresa activa.
2. El backend crea una invitación con token aleatorio (solo guarda su SHA-256), roles y expiración de 7 días.
3. Se envía un email con el enlace `${FRONTEND_URL}/accept-invitation?token=...`.
4. La persona abre el enlace:
   - Si no tiene cuenta: define nombre y contraseña; se crea el usuario y la membership.
   - Si ya tiene cuenta: inicia sesión y acepta; se agrega la membership sin cambiar la contraseña.
5. La invitación queda `accepted` y no puede reutilizarse.

Crear una invitación **no revela** si el email ya existe. La respuesta es la misma en ambos casos (salvo `emailSent`).

## Endpoints

### Administración

| Método | Ruta | Permiso |
|---|---|---|
| POST | `/api/companies/users/invitations` | `core.users.create` |
| GET | `/api/companies/users/invitations` | `core.users.read` |
| DELETE | `/api/companies/users/invitations/:invitationId` | `core.users.create` |

Header obligatorio: `x-company-id`.

### Públicos

| Método | Ruta | Auth |
|---|---|---|
| GET | `/api/auth/invitations/:token` | Público (preview) |
| POST | `/api/auth/invitations/accept` | Público (cuenta nueva) |
| POST | `/api/auth/invitations/accept-authenticated` | JWT (cuenta existente) |

## Reglas

- Una sola invitación pendiente por `(company_id, lower(email))`.
- Invitar de nuevo al mismo email revoca la pendiente anterior.
- Los roles se validan contra la empresa; no se puede asignar un rol de otro tenant.
- El token se guarda hasheado; nunca en claro.
- Expiración: 7 días.
- Aceptar una invitación ya aceptada o revocada devuelve `409`.
- Si el email ya tiene cuenta, el endpoint público devuelve `409` con `code: INVITATION_REQUIRES_LOGIN`.

## Frontend

- `MembersView` usa “Enviar invitación” y llama a `invitationService.create`.
- `MembersView` muestra una sección de **invitaciones pendientes** con email, roles y vencimiento, y permite revocarlas.
- `AcceptInvitationView` (`/accept-invitation?token=...`) muestra la empresa y el email invitado.
  - Si el email no tiene cuenta: pide nombre, contraseña y confirmación.
  - Si ya tiene cuenta: redirige al login con `redirect` y, tras autenticarse, acepta la invitación.
- `LoginView` respeta `?redirect=` para volver a la invitación después de iniciar sesión.

## Pendiente

- Tests de integración con base real.
- Política RLS para lookup público por token cuando la app use `kaleo_app`.
- Reemplazar por completo el flujo multiempresa de “vincular usuario existente” si se decide eliminarlo.
- Reenviar una invitación desde la UI (hoy se logra reinvitando al mismo email).
