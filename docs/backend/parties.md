# Terceros (`shared.parties`)

> **Estado:** fuente única de personas y organizaciones. La usan documentos,
> construcción, CRM y bots.

## Modelo

| Tabla | Uso |
|---|---|
| `parties` | Persona u organización con datos base y `deleted_at` |
| `party_roles` | Roles M:N (`customer`, `supplier`, `contractor`, `employee`, `contact`) |
| `party_identities` | Email, teléfono, WhatsApp, Telegram, web o identidad externa |
| `party_contacts` | Personas de contacto dentro de una organización |
| `party_addresses` | Direcciones con dirección principal |

Reglas:

- RLS por `company_id`.
- `tax_id` es único por empresa, sin distinguir mayúsculas y solo entre activos.
- Una identidad `(company_id, kind, normalized_value)` solo puede pertenecer a un
  tercero. Es la base para resolver el mismo contacto desde varios canales.
- Al eliminar un tercero se hace soft delete y se liberan sus identidades.
- Email y teléfono del alta se convierten automáticamente en identidades.
- Los roles se pueden agregar o quitar sin tocar el resto de la ficha.

### Normalización de identidades

| `kind` | Normalización |
|---|---|
| `email` | minúsculas |
| `phone` / `whatsapp` | solo dígitos, conserva `+` inicial |
| `telegram` | minúsculas, sin `@` |
| `web` | minúsculas, sin `/` final |
| `external` | minúsculas |

## Endpoints

```http
GET    /api/parties?search=&partyType=&role=&status=&page=&limit=
POST   /api/parties
GET    /api/parties/:id
PATCH  /api/parties/:id
DELETE /api/parties/:id

POST   /api/parties/:id/roles
DELETE /api/parties/:id/roles/:role

POST   /api/parties/:id/identities
DELETE /api/parties/:id/identities/:identityId

POST   /api/parties/:id/contacts
PATCH  /api/parties/:id/contacts/:contactId
DELETE /api/parties/:id/contacts/:contactId

POST   /api/parties/:id/addresses
PATCH  /api/parties/:id/addresses/:addressId
DELETE /api/parties/:id/addresses/:addressId

x-company-id: <uuid>
Authorization: Bearer <token>
```

## Permisos

| Código | Acción |
|---|---|
| `core.parties.read` | Leer terceros |
| `core.parties.create` | Crear terceros |
| `core.parties.update` | Editar, roles, identidades, contactos y direcciones |
| `core.parties.delete` | Eliminar terceros |

Owner/Admin tienen los cuatro; Viewer solo lectura.

## Escritura y downgrade

`shared.parties` está incluido en el plan core. Las escrituras pasan por
`assertWritableModule`: si la suscripción vence, la lectura sigue disponible y
las mutaciones devuelven `403 SUBSCRIPTION_READ_ONLY`.

## Uso desde otros módulos

Usa `PartiesService` o las tablas `parties`/`party_identities` con FKs
compuestas `(company_id, party_id)`. No crees tablas de contactos paralelas.
