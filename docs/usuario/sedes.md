# Sedes

## Ver las sedes

En el menú lateral, selecciona **Sedes** (requiere permiso `branches:read`). Verás la lista con nombre, ubicación, contacto y estado.

Puedes filtrar por búsqueda de texto y por estado (Activa/Inactiva).

## Crear una sede

Haz clic en **Nueva Sede** (requiere `branches:create`):

| Campo | Requerido | Descripción |
|---|---|---|
| Nombre | ✅ | Nombre visible de la sede |
| Código | — | Código corto (ej: `BOG-01`) |
| Dirección | — | Dirección física |
| Ciudad, Estado, País, CP | — | Ubicación geográfica |
| Teléfono, Email | — | Datos de contacto |
| Responsable | — | Miembro del equipo asignado |
| Zona Horaria | — | Para registros con contexto de hora local |
| Sede principal | — | Marcar si es la sede principal de la empresa |

## Editar una sede

En el menú de acciones (⋮) → **Editar** (requiere `branches:update`). Todos los campos se pueden modificar.

## Activar / Desactivar

En el menú de acciones → **Activar** o **Desactivar** (requiere `branches:update`).

Al desactivar, aparece un aviso con opción de **Deshacer** por unos segundos.

## Sede principal

Solo puede haber una sede marcada como **Principal** por empresa. Si marcas otra sede como principal, la anterior pierde ese estado automáticamente.

::: danger
No se puede eliminar la sede principal. Primero asigna otra sede como principal.
:::

## Eliminar una sede

En el menú de acciones → **Eliminar** (requiere `branches:delete`). La sede se elimina de forma suave (se puede recuperar vía base de datos si es necesario).
