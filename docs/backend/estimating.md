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
- La importación agrupa filas por `apu_codigo`; los insumos faltantes se crean
  automáticamente por código. Si el APU está aprobado, se crea una nueva
  versión antes de agregar los insumos.

## Endpoints

```http
GET/POST/PATCH/DELETE /api/estimating/resources
GET/POST/DELETE       /api/estimating/resources/:id/prices

GET/POST/PATCH/DELETE /api/estimating/apu-bases
GET/POST              /api/estimating/apus
POST                  /api/estimating/apus/import
GET/PATCH/DELETE      /api/estimating/apus/:id
POST                  /api/estimating/apus/:id/versions
POST                  /api/estimating/apus/:id/approve
POST                  /api/estimating/apus/:id/lines
PATCH/DELETE          /api/estimating/apu-lines/:lineId
```

`POST /api/estimating/apus/import` recibe multipart `file` + `baseId` y acepta
CSV/XLSX con máximo 500 filas. Columnas: `apu_codigo`, `apu_nombre`,
`apu_unidad`, `insumo_codigo`, `insumo_nombre`, `tipo`, `unidad_insumo`,
`cantidad`, `desperdicio`, `rendimiento`, `costo`.

## Permisos

`construction.estimating.read/create/update/delete`. Owner/Admin todos; Viewer lectura.

## Frontend

- `/estimating` con pestañas de recursos, bases y APUs.
- Edición inline de cantidad, desperdicio y rendimiento de insumos en APUs en
  borrador; el APU aprobado se abre en solo lectura y se versiona.
- Modal de precios de proveedor por insumo (listar, agregar y eliminar).
- Importación de APUs desde CSV/XLSX con `UiFileDropzone` y resumen de filas
  creadas/actualizadas.

## Dependencias

El módulo depende de `construction.projects`, `shared.catalog` y
`shared.parties`. Se incluye temporalmente en el plan core.
