# Miembros del Equipo

## Ver los miembros

En el menú lateral, selecciona **Miembros del Equipo** (requiere permiso `users:read`). Verás la lista paginada con nombre, email, roles y estado.

Puedes filtrar por:
- **Búsqueda de texto** — nombre o email
- **Rol** — filtra por un rol específico
- **Estado** — Activo o Inactivo

## Invitar un nuevo miembro

Haz clic en **Nuevo Miembro** (requiere permiso `users:create`):

1. Ingresa el nombre y correo electrónico
2. Asigna uno o más roles
3. (Opcional) Teléfono, cargo, documento
4. Haz clic en **Agregar al Equipo**

Si el correo **ya existe** en el sistema, busca al usuario con la barra de búsqueda del formulario y selecciónalo para vincularlo sin crear una cuenta nueva.

Si el correo es **nuevo**, se crea la cuenta automáticamente con una contraseña temporal que se envía al email indicado.

## Editar un miembro

Haz clic en los **tres puntos** (⋮) junto al miembro → **Editar** (requiere `users:update`):

- Cambiar roles asignados
- Cambiar estado (Activo / Inactivo)
- Actualizar teléfono, cargo y documento

Al desactivar un miembro, verás un aviso con la opción de **Deshacer** por unos segundos.

## Resetear contraseña

En el menú de acciones del miembro → **Resetear contraseña** (requiere `users:update`):

- **Solo generar:** Genera una contraseña temporal y la muestra en pantalla para que el admin la comparta manualmente.
- **Generar y enviar:** Genera la contraseña y la envía automáticamente al email del miembro.

## Gestionar empresas

Si administras más de una empresa, puedes asignar o quitar a un miembro de otras empresas desde el menú **Gestionar empresas**.

## Eliminar un miembro

En el menú de acciones → **Eliminar** (requiere `users:delete`). El miembro pierde acceso a la empresa, pero **su cuenta no se elimina** — puede ser invitado de nuevo.

::: warning
No puedes eliminarte a ti mismo del equipo. Pide a otro administrador que lo haga.
:::
