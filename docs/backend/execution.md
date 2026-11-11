# Ejecución de obra (`construction.execution`)

> **Estado:** módulo liviano de ejecución con programación, contratos, nómina,
> almacén y órdenes de compra. Reutiliza proyectos, terceros, catálogo,
> estimación y presupuestos.

## Modelo

| Tabla | Uso |
|---|---|
| `schedule_activities` | Cronograma: fechas, avance, predecesora y estado |
| `contracts` | Contratos de obra, subcontrato, servicio o suministro |
| `payroll_entries` | Registros de nómina por trabajador y período |
| `warehouses` | Almacenes de empresa o de proyecto |
| `stock_movements` | Entradas, salidas y ajustes de insumos |
| `purchase_orders` | Cabecera de órdenes de compra |
| `purchase_order_lines` | Líneas de la orden con cantidad y precio |

Reglas:

- RLS por empresa y `company_id` explícito en todas las consultas.
- El progreso del cronograma va de 0 a 100.
- Las fechas de contrato y nómina no pueden invertirse.
- El monto de contratos y nómina es `numeric(18,2)`; los precios y cantidades
  usan la precisión del catálogo/estimación.
- Los movimientos de almacén exigen cantidad mayor a cero y un recurso válido.
- Una orden de compra con estado `received` queda cerrada y no se edita.
- Las órdenes guardan líneas con `resource_id` opcional, descripción,
  cantidad y valor unitario; el total se calcula en el backend.

## Endpoints

```http
GET/POST              /api/projects/:projectId/schedule
PATCH/DELETE          /api/schedule/:id

GET/POST              /api/projects/:projectId/contracts
PATCH/DELETE          /api/contracts/:id

GET/POST              /api/projects/:projectId/payroll
PATCH/DELETE          /api/payroll/:id

GET/POST              /api/warehouses
PATCH/DELETE          /api/warehouses/:id
GET/POST              /api/warehouses/:id/movements
DELETE                /api/stock-movements/:id

GET/POST              /api/projects/:projectId/purchase-orders
GET/PATCH/DELETE      /api/purchase-orders/:id
```

## Permisos

- `construction.execution.read`
- `construction.execution.create`
- `construction.execution.update`
- `construction.execution.delete`

Owner/Admin todos; Viewer lectura. La vista se registra en el manifest
`construction.execution` (orden 82) y se incluye en el plan core.

## Frontend

- `/companies/:companyId/projects/:projectId/execution` con pestañas
  **Programación**, **Contratos**, **Nómina**, **Almacén** y **Compras**.
- CRUD básico con modales `Ui*`, badges de estado y confirmación de borrado.
- Almacén en dos paneles: lista de almacenes y movimientos del seleccionado.
- Compras: creación con líneas dinámicas y detalle con cambio de estado.
- Acceso directo desde el workspace del proyecto.
