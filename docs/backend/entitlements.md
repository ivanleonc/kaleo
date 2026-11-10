# Planes y entitlements

> **Estado:** base de Fase 2. Hay un plan `core` asignado a las empresas
> existentes. Los packs se añadirán a `plan_modules` cuando existan.

## Modelo

| Tabla | Uso |
|---|---|
| `plans` | Catálogo de planes (`code`, nombre, trial, precio, intervalo) |
| `plan_modules` | Módulos incluidos por plan |
| `plan_limits` | Límites por `(plan, module, feature)` |
| `subscriptions` | Suscripción activa de una empresa |
| `company_entitlements` | Overrides por empresa con expiración |
| `usage_counters` | Consumo por empresa/módulo/feature/período |

Reglas:

- Una empresa tiene como máximo una suscripción activa (`trialing`, `active`, `past_due`).
- `limit_value = NULL` significa ilimitado.
- `period`: `none`, `month` o `year`.
- `is_hard = true` bloquea con `402`; `false` solo registra.
- Los overrides de empresa tienen prioridad sobre el plan.
- Los módulos `core.*` son always-on y no dependen del plan.
- `GET /api/modules` incluye un pack si está en `plan_modules` o en `company_modules`.

## Endpoint

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
      "currentPeriodEnd": null
    },
    "modules": ["core.users", "core.branches", "..."],
    "limits": [],
    "overrides": [],
    "usage": []
  }
}
```

## Enforcement

`EntitlementService` expone:

- `isModuleIncluded(companyId, moduleCode)`
- `assertModule(companyId, moduleCode)` → `402 MODULE_NOT_ENTITLED`
- `getLimit(companyId, moduleCode, featureCode)`
- `assertWithinLimit(companyId, moduleCode, featureCode, amount)` → `402 LIMIT_EXCEEDED`
- `consume(companyId, moduleCode, featureCode, amount)`

Orden recomendado en un endpoint:

1. `assertModule(...)`
2. `assertWithinLimit(...)`
3. ejecutar la operación de negocio
4. `consume(...)`

> `assertWithinLimit` + `consume` no es atómico entre requests concurrentes.
> Para límites financieros estrictos, mover la validación y el incremento a una
> sola sentencia/transacción.

## Límite activo: análisis por mes

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

> El contador se incrementa después de crear el análisis. Si el incremento
> falla, el análisis queda creado y se registra un warning; no se revierte la
> operación.

## Frontend

`SettingsView` muestra:

- plan actual, código y estado,
- cantidad de módulos incluidos,
- límites efectivos (plan + overrides),
- consumo actual por límite.

El modal de creación de análisis detecta `LIMIT_EXCEEDED`/`MODULE_NOT_ENTITLED`:
oculta “Reintentar guardado” y ofrece “Ver plan y límites”.

## Migración

`041-plans-entitlements.sql` crea las tablas, siembra el plan `core` y asigna
una suscripción activa a las empresas existentes.

Es aditiva; puede aplicarse antes del deploy de este backend.
