# Proyectos (`construction.projects`)

> **Estado:** primer pack vertical. Proyectos con cliente desde `shared.parties`,
> equipo desde memberships, moneda y fechas.

## Modelo

| Tabla | Uso |
|---|---|
| `projects` | Código, nombre, cliente, sede, estado, moneda, fechas y ubicación |
| `project_members` | Equipo del proyecto y rol por miembro |

Reglas:

- RLS por `company_id`.
- Código único por empresa, sin distinguir mayúsculas y solo entre activos.
- `client_party_id` referencia `parties(company_id, id)`; no se pueden cruzar tenants.
- `branch_id` referencia `branches(company_id, id)`.
- `currency_code` usa `currencies`.
- `end_date >= start_date` cuando ambas existen.
- `project_members.membership_id` referencia memberships activas de la empresa.
- Roles: `manager`, `estimator`, `resident`, `supervisor`, `viewer`.

## Endpoints

```http
GET    /api/projects?search=&status=&branchId=&clientPartyId=&page=&limit=
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id

GET    /api/projects/:id/members
POST   /api/projects/:id/members
PATCH  /api/projects/:id/members/:membershipId
DELETE /api/projects/:id/members/:membershipId

x-company-id: <uuid>
Authorization: Bearer <token>
```

Body de miembro:

```json
{
  "userId": "<uuid del usuario>",
  "projectRole": "manager"
}
```

El backend resuelve la membership activa del usuario; no se acepta una
membership de otra empresa.

## Permisos

| Código | Acción |
|---|---|
| `construction.projects.read` | Ver proyectos y equipo |
| `construction.projects.create` | Crear proyectos |
| `construction.projects.update` | Editar proyecto y equipo |
| `construction.projects.delete` | Eliminar proyectos |

Owner/Admin tienen los cuatro; Viewer solo lectura.

## Dependencias y plan

- El manifest depende de `shared.parties`.
- Se incluye temporalmente en el plan core para poder operarlo antes de
  comercializar packs.
- Las escrituras pasan por `assertWritableModule`; con suscripción vencida el
  proyecto es de solo lectura.

## Siguiente nivel

Los siguientes bloques de construcción usan `projects.id`:

- `resources` y `resource_prices`
- `apus`, `apu_versions`, `apu_lines`
- `takeoff_sheets`, `takeoff_lines`
- `budgets`, `budget_items`, `budget_approvals`
