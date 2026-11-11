# Notificaciones

> **Estado:** in-app + email con preferencias por usuario y empresa.

## Modelo

| Tabla | Uso |
|---|---|
| `notifications` | Aviso personal (`company_id`, `user_id`, tipo, categoría, payload, `read_at`) |
| `notification_preferences` | Canales habilitados por usuario y categoría |

RLS por `company_id`. Además, el repositorio siempre filtra por `user_id`: una
notificación solo la ve su destinatario aunque comparta empresa.

### Categorías

| Código | Avisos |
|---|---|
| `operations` | Exports, reportes e importaciones |
| `documents` | Cargas, versiones y cambios de documentos |
| `security` | Accesos y cambios sensibles |
| `system` | Avisos generales |

Los tipos siguen `categoria.evento` (`operation.completed`). Si el tipo no
coincide con una categoría conocida se usa `system`.

## Preferencias

Cada categoría tiene dos canales:

- `inApp`: si está apagado no se persiste la notificación.
- `email`: si está apagado no se encola el correo.

Sin fila guardada, ambos canales están activos. Si el usuario apaga ambos, el
evento no genera nada.

## Endpoints

```http
GET  /api/notifications?unreadOnly=true&limit=20
GET  /api/notifications/unread-count
GET  /api/notifications/preferences
PUT  /api/notifications/preferences
POST /api/notifications/:id/read
POST /api/notifications/read-all
x-company-id: <uuid>
Authorization: Bearer <token>
```

Body de preferencias:

```json
{
  "preferences": [
    { "category": "operations", "inApp": true, "email": false }
  ]
}
```

Las notificaciones son datos personales: los endpoints se autorizan con JWT +
membership de la empresa, no con un permiso RBAC. Cualquier miembro puede ver y
gestionar solo las suyas.

## Integración con operaciones

`OperationsJobHandler` notifica al usuario que creó la operación:

- al quedar `ready` → `operation.completed`;
- al fallar → `operation.failed` con el error truncado.

La notificación incluye `link: "/operations"` y `data.operationId`. Un fallo al
crear la notificación no cambia el resultado de la operación.

## Email

El correo se encola en `email.send` usando el mismo job handler que el resto de
transacciones. El enlace absoluto se construye con `FRONTEND_URL` y el UUID de la
empresa (el router lo canoniza a slug).

Si el envío falla, el job reintenta con backoff; la notificación in-app ya
quedó guardada.
