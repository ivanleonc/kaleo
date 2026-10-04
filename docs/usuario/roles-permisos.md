# Roles y Permisos

## Conceptos clave

### Roles del sistema
Kaleo incluye tres roles fijos que no se pueden modificar:

| Rol | Nivel de acceso |
|---|---|
| **Owner** | Control total de la empresa — usuarios, roles, configuración, todo |
| **Admin** | Casi todo, excepto gestión de roles y eliminación de usuarios |
| **Viewer** | Solo lectura en todas las secciones a las que tiene acceso |

### Roles personalizados
Puedes crear roles adicionales con combinaciones específicas de permisos. Ejemplo: "Gestor de Ventas" con acceso solo a facturas y clientes.

## Ver los roles

En el menú lateral, selecciona **Roles y Permisos** (requiere `roles:read`). Verás tarjetas para cada rol con sus permisos agrupados por módulo.

Haz clic en el nombre de un módulo para expandir/colapsar sus permisos.

## Crear un rol personalizado

Haz clic en **Crear Nuevo Rol** (requiere `roles:create`):

1. Ingresa el **nombre** del rol (obligatorio)
2. Agrega una **descripción** opcional
3. Elige un **color** en formato hexadecimal (ej: `#8b5cf6`) — opcional
4. En el listbox de permisos, mueve los permisos deseados de "Disponibles" a "Asignados al Rol"
5. Haz clic en **Guardar Rol**

## Editar un rol

En el menú de acciones (⋮) de la tarjeta del rol → **Editar Rol** (requiere `roles:update`):
- Cambia el nombre, descripción, color
- Agrega o quita permisos

::: warning Los roles del sistema no se editan
Los roles `Owner`, `Admin` y `Viewer` no aparecen con el menú de edición. Sus permisos son fijos.
:::

## Eliminar un rol

En el menú de acciones → **Eliminar Rol** (requiere `roles:delete`, solo Owner).

::: danger
Para confirmar la eliminación debes **escribir el nombre exacto del rol** en el campo de confirmación. Esta acción quita el rol a todos los miembros que lo tenían asignado inmediatamente.
:::
