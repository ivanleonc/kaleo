# Module registry

> **Estado:** registrado y sincronizado desde manifests en código.
> Los módulos `core.*` son always-on; los packs se habilitan por empresa.

## Modelo

| Tabla | Uso |
|---|---|
| `modules` | Catálogo de módulos (`code`, `name`, `vertical`, `version`, `is_core`, `status`) |
| `module_dependencies` | Dependencias declaradas entre módulos |
| `company_modules` | Habilitación explícita por empresa (`enabled`, `trial`, `read_only`, `disabled`) |

Reglas:

- `core.*` siempre está habilitado y no necesita fila en `company_modules`.
- Un módulo shared/pack aparece solo si tiene fila `enabled`, `trial` o `read_only`.
- Un módulo `core.*` no puede depender de un pack.
- Los ciclos de dependencias se rechazan al arrancar.
- `modules` y `module_dependencies` son catálogo global de solo lectura para `kaleo_app`.
- `company_modules` tiene RLS por `company_id`.

## Manifests

Código fuente: `backend/src/kernel/modules/module-manifests.ts`.

Cada manifest declara:

- `code`, `name`, `version`, `vertical`, `isCore`
- `dependsOn`
- `permissions`
- `routes` (path, nombre, título, permiso, icono, orden)
- `featureFlags` opcional

Al iniciar, `ModuleRegistryService`:

1. Valida códigos, dependencias, ciclos y la regla core→pack.
2. Hace upsert de `modules` y `module_dependencies` con el DataSource `auth`.
3. Registra en logs cuántos módulos sincronizó.

## Endpoint

```http
GET /api/modules
x-company-id: <uuid>
Authorization: Bearer <token>
```

Devuelve los manifests habilitados con su estado:

```json
{
  "success": true,
  "data": [
    {
      "code": "core.users",
      "name": "Usuarios y miembros",
      "version": "1.0.0",
      "vertical": null,
      "isCore": true,
      "dependsOn": [],
      "permissions": ["core.users.read", "..."],
      "routes": [
        {
          "path": "/members",
          "name": "Members",
          "title": "Equipo",
          "permission": "core.users.read",
          "icon": "users",
          "order": 30
        }
      ],
      "status": "enabled"
    }
  ]
}
```

## Frontend shell

- `useModulesStore` carga `GET /api/modules` al cambiar de empresa en `AuthenticatedLayout`.
- El sidebar consulta `modulesStore.isEnabled(code)` antes de mostrar cada entrada.
- Las rutas llevan `meta.moduleCode`; el router bloquea módulos de pack/shared no habilitados.
- Los `core.*` pasan siempre, incluso antes de que termine la carga.

## Agregar un módulo

1. Añadir el manifest en `module-manifests.ts`.
2. Declarar sus dependencias y permisos.
3. Si es pack/shared, crear su fila en `company_modules` cuando se active.
4. Consumir `GET /api/modules` en el shell.
5. Test de validación: dependencia faltante, ciclo o core→pack debe fallar.

## Despliegue

Aplicar `040-module-registry.sql` **antes** de desplegar este backend: el
servicio sincroniza el catálogo al arrancar y falla si las tablas no existen.

La migración es aditiva; el backend anterior sigue funcionando si se aplica
primero.
