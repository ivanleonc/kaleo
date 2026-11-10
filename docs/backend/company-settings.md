# Configuración de empresa

> **Estado:** preferencias regionales tipadas y base para configuración por
> módulo.

## Modelo

Tabla `company_settings`:

| Columna | Uso |
|---|---|
| `company_id` | PK, FK a `companies` con `ON DELETE CASCADE` |
| `currency_code` | ISO 4217 de 3 letras (`COP`, `USD`, ...) |
| `locale` | Locale simple (`es-CO`, `en-US`, ...) |
| `settings` | JSONB extensible para configuración futura por módulo |
| `created_at`, `updated_at` | Auditoría básica |

- RLS por `company_id`.
- Un trigger crea la fila automáticamente al insertar una empresa.
- La migración `043` hace backfill para empresas existentes.

## Endpoints

```http
GET /api/company-settings
x-company-id: <uuid>
```

Permiso: `core.company.read`.

```http
PUT /api/company-settings
x-company-id: <uuid>

{
  "currencyCode": "USD",
  "locale": "en-US",
  "settings": {}
}
```

Permiso: `core.company.update`. La escritura queda auditada.

## Frontend

En **Ajustes → Preferencias regionales**:

- moneda,
- locale,
- botón de guardado filtrado por `core.company.update`.

`settings` queda disponible para la configuración por módulo en el siguiente
bloque.

## Migración

`043-company-settings.sql` es aditiva. Aplicarla antes del deploy del backend:
el endpoint y el trigger de empresas nuevas dependen de la tabla.
