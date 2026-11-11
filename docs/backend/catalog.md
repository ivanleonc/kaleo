# Catálogo (`shared.catalog`)

> **Estado:** monedas globales, unidades/conversiones y tasas de impuesto por
> empresa. Es la base numérica de recursos, APUs y presupuestos.

## Modelo

| Tabla | Uso |
|---|---|
| `currencies` | Catálogo global ISO 4217 (`code`, símbolo, decimales) |
| `units_of_measure` | Unidades globales (`company_id NULL`) o propias de la empresa |
| `unit_conversions` | Factores entre unidades del mismo tipo |
| `tax_rates` | Impuestos por empresa (`rate numeric(9,4)`, país ISO opcional) |

Reglas:

- RLS en unidades, conversiones e impuestos. Las unidades/conversiones globales
  son legibles por todas las empresas.
- Una empresa no puede editar ni eliminar unidades globales.
- Código de unidad único por alcance: global o empresa.
- Código de impuesto único por empresa y solo entre activos.
- Soft delete en unidades e impuestos; las conversiones de empresa se eliminan
  físicamente.
- Las conversiones solo se permiten entre unidades del mismo `kind` y con
  `factor > 0`.

## Unidades base

Se siembran unidades globales para longitud, área, volumen, masa, cantidad y
tiempo (`m`, `m2`, `m3`, `kg`, `t`, `un`, `hr`, `day`, ...), junto con factores
comunes (`m→cm`, `kg→g`, `l→ml`, etc.).

## Endpoints

```http
GET    /api/catalog/currencies
GET    /api/catalog/units?search=&kind=&includeInactive=
POST   /api/catalog/units
PATCH  /api/catalog/units/:id
DELETE /api/catalog/units/:id

GET    /api/catalog/units/:id/conversions
POST   /api/catalog/units/:id/conversions
DELETE /api/catalog/units/:id/conversions/:conversionId

GET    /api/catalog/tax-rates?search=&includeInactive=
POST   /api/catalog/tax-rates
PATCH  /api/catalog/tax-rates/:id
DELETE /api/catalog/tax-rates/:id

x-company-id: <uuid>
Authorization: Bearer <token>
```

## Permisos

| Código | Acción |
|---|---|
| `core.catalog.read` | Ver monedas, unidades, conversiones e impuestos |
| `core.catalog.create` | Crear unidades, conversiones e impuestos |
| `core.catalog.update` | Editar unidades e impuestos |
| `core.catalog.delete` | Eliminar unidades, conversiones e impuestos de empresa |

Owner/Admin tienen los cuatro; Viewer solo lectura. Las monedas son globales y
de solo lectura desde la API.

## Dinero y cantidades

- Monetarios: `numeric(18,2)`.
- Precios/rates: `numeric(18,6)`.
- Cantidades: `numeric(18,6)`.
- Porcentajes: `numeric(9,4)`.
- Moneda: `char(3)`.

No usar `float` para dinero. El catálogo expone los decimales de cada moneda
para que los módulos financieros apliquen el redondeo correcto.

## Downgrade

`shared.catalog` está incluido en el plan core. Las escrituras pasan por
`assertWritableModule`: con suscripción vencida la lectura sigue disponible y
las mutaciones devuelven `403 SUBSCRIPTION_READ_ONLY`.
