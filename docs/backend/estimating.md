# Estimación (`construction.estimating`)

> **Estado:** recursos, precios de proveedor, bases de APUs y APUs versionados.
> Es la biblioteca reutilizable para presupuestos de obra.

## Modelo

| Tabla | Uso |
|---|---|
| `resources` | Insumos: material, mano de obra, equipo, transporte, subcontrato |
| `resource_prices` | Precio por proveedor, moneda y vigencia |
| `apu_bases` | Bibliotecas de APUs (ej. una base de proveedor) |
| `apus` | APU maestro: código, nombre, unidad, base, estado y versión actual |
| `apu_versions` | Versiones inmutables (`draft`, `approved`, `superseded`) |
| `apu_lines` | Insumos del APU con cantidad, desperdicio, rendimiento y costo snapshot |

Reglas:

- RLS por empresa.
- Código de recurso y código de APU único dentro de su alcance/base.
- El APU aprobado no se edita: se crea una nueva versión que copia los insumos.
- Los insumos solo se modifican en versiones `draft`.
- `apu_lines.unit_cost_snapshot` congela el costo del recurso al agregarlo.
- `component_type` se deriva del tipo de recurso y se usa para agrupar E/M/O/TR/SC.
- El costo unitario del APU se calcula con:
  `cantidad × (1 + desperdicio/100) × rendimiento × costo unitario`.

## Endpoints

```http
GET/POST/PATCH/DELETE /api/estimating/resources
GET/POST/DELETE       /api/estimating/resources/:id/prices

GET/POST/PATCH/DELETE /api/estimating/apu-bases
GET/POST              /api/estimating/apus
GET/PATCH/DELETE      /api/estimating/apus/:id
POST                  /api/estimating/apus/:id/versions
POST                  /api/estimating/apus/:id/approve
POST                  /api/estimating/apus/:id/lines
PATCH/DELETE          /api/estimating/apu-lines/:lineId
```

## Permisos

`construction.estimating.read/create/update/delete`. Owner/Admin todos; Viewer lectura.

## Dependencias

El módulo depende de `construction.projects`, `shared.catalog` y
`shared.parties`. Se incluye temporalmente en el plan core.
