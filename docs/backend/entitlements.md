# Planes y entitlements

> **Estado:** Fase 2 cerrando. Hay planes administrables, trial, downgrade a solo
> lectura y dos límites reales: análisis por mes (consumo) y usuarios activos
> (valor actual).

## Modelo

| Tabla | Uso |
|---|---|
| `plans` | Catálogo de planes (`code`, nombre, trial, precio, intervalo) |
| `plan_modules` | Módulos incluidos por plan |
| `plan_limits` | Límites por `(plan, module, feature)` |
| `subscriptions` | Suscripción de una empresa |
| `company_entitlements` | Overrides por empresa con expiración |
| `usage_counters` | Consumo por empresa/módulo/feature/período |

Reglas:

- Una empresa tiene como máximo una suscripción vigente (`trialing`, `active`, `past_due`).
- La suscripción más reciente se usa también para detectar `canceled`/`expired`.
- `limit_value = NULL` significa ilimitado.
- `period`: `none`, `month` o `year`.
- `is_hard = true` bloquea con `402`; `false` solo registra.
- Los overrides de empresa tienen prioridad sobre el plan.
- Los módulos `core.*` son always-on y no dependen del plan.

### Tipos de límite

| `limit_kind` | Significado | Enforcement |
|---|---|---|
| `usage` | Consumo acumulado por período | `assertWithinLimit` + `consume` |
| `gauge` | Valor actual del dominio (ej. usuarios activos) | `assertGaugeLimit(current)` |

## Trial

- Cada plan define `trial_days` (`core` = 14 días).
- Al asignar una suscripción con `status = trialing` y sin `currentPeriodEnd`,
  el backend calcula `now + trial_days`.
- Al vencer el período: la suscripción queda en solo lectura; no se borran datos.

## Solo lectura y downgrade

Una suscripción es de solo lectura cuando:

- `status` es `past_due`, `canceled` o `expired`, o
- `current_period_end <= now`.

Reglas de escritura:

| Módulo | Suscripción vencida | Módulo fuera del plan |
|---|---|---|
| `core.*` | ✅ escribible | ✅ escribible |
| Pack | 🔎 lectura / ❌ escritura (`403 SUBSCRIPTION_READ_ONLY`) | 🔎 lectura / ❌ escritura (`403 MODULE_NOT_ENTITLED`) |

- Un pack fuera del plan sigue siendo legible si la empresa ya lo tenía habilitado
  (`company_modules` con estado `enabled`, `trial` o `read_only`).
- Un pack que sale del plan permanece visible como `read_only`; sus datos no se borran.
- `GET /api/modules` devuelve `status = read_only` para esos packs.

## Endpoints

### Empresa

```http
GET /api/entitlements
x-company-id: <uuid>
Authorization: Bearer <token>
```

Respuesta:

```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "uuid",
      "code": "core",
      "name": "Core",
      "status": "active",
      "currentPeriodStart": "2026-11-10T00:00:00.000Z",
      "currentPeriodEnd": null,
      "trialDays": 14
    },
    "modules": ["core.users", "core.branches", "..."],
    "limits": [],
    "overrides": [],
    "usage": [],
    "readOnly": false,
    "trialEndsAt": null
  }
}
```

### Administración (super-admin)

```http
GET  /api/admin/plans
POST /api/admin/plans
PUT  /api/admin/plans/:id
PUT  /api/admin/plans/:id/modules
PUT  /api/admin/plans/:id/limits
GET  /api/admin/companies/:companyId/subscription
PUT  /api/admin/companies/:companyId/subscription
```

Asignar plan o trial:

```json
{
  "planCode": "construction",
  "status": "trialing",
  "trialDays": 14
}
```

- Sin `currentPeriodEnd`, un `trialing` usa `trialDays` o el `trial_days` del plan.
- Asignar un plan reemplaza la suscripción vigente; no borra datos.
- Los módulos `core.*` siempre se incluyen al configurar un plan.
- Los límites solo pueden apuntar a módulos incluidos en el plan.

## Enforcement

`EntitlementService` expone:

- `isModuleIncluded(companyId, moduleCode)` (plan o acceso previo de lectura)
- `assertModule(companyId, moduleCode)` → `402 MODULE_NOT_ENTITLED` (lectura)
- `assertPlanModule(companyId, moduleCode)` → `402 MODULE_NOT_ENTITLED` (solo plan)
- `assertWritableModule(companyId, moduleCode)` → `403 MODULE_NOT_ENTITLED` / `403 SUBSCRIPTION_READ_ONLY`
- `isReadOnly(companyId)`
- `getLimit(companyId, moduleCode, featureCode)`
- `assertWithinLimit(...)` → `402 LIMIT_EXCEEDED`
- `assertGaugeLimit(companyId, moduleCode, featureCode, current)` → `402 LIMIT_EXCEEDED`
- `consume(...)`

Orden recomendado en un endpoint de escritura:

1. `assertModule(...)`
2. `assertWritableModule(...)`
3. `assertWithinLimit(...)` / `assertGaugeLimit(...)`
4. ejecutar la operación de negocio
5. `consume(...)`

> `assertWithinLimit` + `consume` no es atómico entre requests concurrentes.
> Para límites financieros estrictos, mover la validación y el incremento a una
> sola sentencia/transacción.

## Límite de análisis por mes

El plan `core` incluye:

| Módulo | Feature | Límite | Período | Tipo |
|---|---|---|---|---|
| `core.analyses` | `create` | 100 | mes | duro |

`AnalysesService.createAnalysis` ejecuta:

1. `assertModule('core.analyses')`
2. `assertWithinLimit(..., 'create', 1)`
3. crea el análisis,
4. `consume(..., 'create', 1)`.

Si se supera el límite, responde `402 LIMIT_EXCEEDED` antes de escribir.

## Límite de usuarios activos

`plan_limits` del plan `core`:

| Módulo | Feature | Límite | Período | Tipo |
|---|---|---|---|---|
| `core.users` | `max_active` | 50 | — | gauge, duro |

Se valida al:

- crear un miembro (`MemberService.addMember`),
- vincular un usuario existente (`attachMember`),
- reactivar una membership (`updateMember` con `status = active`),
- crear invitaciones, contando **activos + pendientes** para reservar cupo,
- aceptar una invitación no se revalida: el cupo quedó reservado al invitar.

No se bloquea si el usuario ya es miembro activo de la empresa.

## Frontend

- `SettingsView` muestra plan, módulos, límites y consumo.
- `PlansAdminView` (`/companies/:companyId/plans`, super-admin) permite:
  - listar/crear/editar planes,
  - reemplazar módulos y límites,
  - asignar plan, estado y trial a la empresa activa.
- `AuthenticatedLayout` muestra un banner de solo lectura cuando la
  suscripción venció.

## Migración

- `041-plans-entitlements.sql` crea las tablas, siembra el plan `core` y asigna
  una suscripción activa a las empresas existentes.
- `050-plans-trial-readonly.sql` añade `limit_kind`, fija el trial de `core` en
  14 días y crea el límite gauge `core.users.max_active = 50`.

Ambas son aditivas; pueden aplicarse antes del deploy del backend.
