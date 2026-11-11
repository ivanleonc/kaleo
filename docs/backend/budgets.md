# Presupuestos de proyecto

> **Estado:** múltiples versiones por proyecto con comparador, presupuesto WBS,
> actividades desde APUs, cantidades, responsables, indirectos, bloqueo por
> aprobación, listado total de insumos, importación y takeoff.

## Modelo

| Tabla | Uso |
|---|---|
| `budgets` | Cabecera: proyecto, moneda, base APU, versión, etiqueta, indirectos y totales |
| `budget_items` | Árbol WBS: capítulos y actividades |
| `budget_approvals` | Snapshot al aprobar |
| `takeoff_sheets` | Hojas de memoria de cantidades por proyecto/actividad |
| `takeoff_lines` | Líneas con piezas, dimensiones y cantidad |

Reglas:

- Cada proyecto puede tener varias versiones numeradas (`version`) con etiqueta
  opcional (`label`); la más reciente es la de trabajo.
- Solo se versiona un presupuesto `approved` o `superseded`; un borrador se
  edita directamente.
- `budget_items` usa `parent_id`; capítulos agrupan actividades.
- Una actividad puede referenciar un APU y su versión.
- `unit_price` de una actividad con APU se toma del costo unitario del APU.
- `partial_amount = quantity × unit_price`.
- Capítulos calculan subtotales desde sus hijos.
- `subtotal` = suma de actividades.
- `indirect_total = subtotal × indirect_pct / 100 + indirect_fixed`.
- `total = subtotal + indirect_total`.
- Un presupuesto aprobado queda bloqueado; se guarda snapshot en `budget_approvals`.
- El comparador empareja ítems por `code` y reporta `added`, `removed`,
  `modified` o `unchanged`.
- El listado total de insumos consolida cantidades y costos de los APUs de
  todas las actividades, agrupando por recurso y unidad.
- La cantidad de takeoff es `quantity` explícita si es mayor a cero; si no,
  `parts × largo × ancho × alto` (las dimensiones en cero se ignoran).
- Al aplicar takeoff se suman solo las líneas con la unidad de la actividad; la
  hoja queda `confirmed`.

## Endpoints

```http
GET  /api/projects/:projectId/budget
GET  /api/projects/:projectId/budgets
GET  /api/budgets/:id
POST /api/projects/:projectId/budget
POST /api/projects/:projectId/budget/import
PATCH /api/budgets/:id
POST /api/budgets/:id/versions
GET  /api/budgets/:id/compare/:otherId
GET  /api/budgets/:id/materials
GET  /api/budgets/:id/materials/export?format=csv|xlsx
GET  /api/budgets/:id/export?format=csv|xlsx
POST /api/budgets/:id/calculate
POST /api/budgets/:id/approve
POST /api/budgets/:id/items
POST /api/budgets/:id/items/from-apus
PATCH/DELETE /api/budgets/:id/items/:itemId

GET  /api/projects/:projectId/takeoff
POST /api/projects/:projectId/takeoff
GET/PATCH/DELETE /api/takeoff/sheets/:id
POST /api/takeoff/sheets/:id/lines
POST /api/takeoff/sheets/:id/apply
PATCH/DELETE /api/takeoff/lines/:lineId
```

Body para agregar desde APUs:

```json
{
  "apuIds": ["<uuid>"],
  "parentId": "<uuid-capítulo-opcional>"
}
```

La importación (`POST /api/projects/:projectId/budget/import`) acepta CSV/XLSX
multipart con máximo 500 filas. Columnas reconocidas:

`capitulo_codigo`, `capitulo`/`capitulo_nombre`, `codigo`, `actividad`/`nombre`,
`unidad`, `cantidad`, `valor_unitario`/`precio_unitario`.

Filas con el mismo capítulo se agrupan; las actividades existentes se
actualizan por código.

## Permisos

- `construction.projects.budget.read`
- `construction.projects.budget.update`
- `construction.projects.budget.approve`

Owner/Admin todos; Viewer lectura. Los enlaces compartidos usan
`construction.projects.share`.

## Frontend

- `/projects/:projectId/budget` con pestañas **Presupuesto**, **Insumos**,
  **Versiones y comparador** y **Takeoff**.
- Tabla WBS con expandir/colapsar, edición de cantidad y valor unitario.
- Responsable por actividad y selector de APUs por base con envío múltiple.
- Footer de costos directos, indirectos y total; aprobación con bloqueo.
- Selector de versiones, creación desde una versión bloqueada, edición de
  etiqueta y comparador con diferencias por ítem y totales.
- Listado total de insumos con exportación CSV/XLSX y reporte imprimible/PDF.
- Importación de presupuesto y de APUs con `UiFileDropzone`.
- Takeoff: hojas, líneas por dimensiones o cantidad explícita y aplicación de
  la cantidad a la actividad.
- Reporte imprimible con presupuesto e insumos (`window.print()`).
