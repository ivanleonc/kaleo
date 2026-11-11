# Presupuestos de proyecto

> **Estado:** presupuesto único por proyecto con árbol WBS, actividades desde
> APUs, cantidades, responsables, indirectos y bloqueo por aprobación.

## Modelo

| Tabla | Uso |
|---|---|
| `budgets` | Cabecera: proyecto, moneda, base APU, indirectos y totales |
| `budget_items` | Árbol WBS: capítulos y actividades |
| `budget_approvals` | Snapshot al aprobar |

Reglas:

- Un presupuesto activo por proyecto.
- `budget_items` usa `parent_id`; capítulos agrupan actividades.
- Una actividad puede referenciar un APU y su versión.
- `unit_price` de una actividad con APU se toma del costo unitario del APU.
- `partial_amount = quantity × unit_price`.
- Capítulos calculan subtotales desde sus hijos.
- `subtotal` = suma de actividades.
- `indirect_total = subtotal × indirect_pct / 100 + indirect_fixed`.
- `total = subtotal + indirect_total`.
- Un presupuesto aprobado queda bloqueado; se guarda snapshot en `budget_approvals`.

## Endpoints

```http
GET  /api/projects/:projectId/budget
POST /api/projects/:projectId/budget
PATCH /api/budgets/:id
POST /api/budgets/:id/calculate
POST /api/budgets/:id/approve
POST /api/budgets/:id/items
POST /api/budgets/:id/items/from-apus
PATCH/DELETE /api/budgets/:id/items/:itemId
```

Body para agregar desde APUs:

```json
{
  "apuIds": ["<uuid>"],
  "parentId": "<uuid-capítulo-opcional>"
}
```

## Permisos

- `construction.projects.budget.read`
- `construction.projects.budget.update`
- `construction.projects.budget.approve`

Owner/Admin todos; Viewer lectura.

## Frontend

- `/projects/:projectId/budget`
- Tabla WBS con expandir/colapsar.
- Edición de cantidad y valor unitario.
- Responsable por actividad.
- Selector de APUs por base y envío múltiple.
- Detalle de APU con insumos agrupados.
- Footer de costos directos, indirectos y total.
- Aprobación con bloqueo.
