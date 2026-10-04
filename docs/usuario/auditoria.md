# Auditoría

## ¿Qué es la auditoría?

El módulo de Auditoría registra **todas las acciones** realizadas en tu organización: quién hizo qué, cuándo, desde qué IP, y cuáles fueron los cambios (valores antes y después).

Navega a **Auditoría** en el menú lateral (requiere permiso `audit:read`).

## Entender el timeline

Cada evento muestra:

- **Método HTTP + ruta** — qué acción se realizó (ej: `POST /api/companies/users`)
- **Descripción legible** — (ej: "Miembro agregado")
- **Estado HTTP** — código de respuesta (200, 201, 403, etc.)
- **Usuario** — quién realizó la acción
- **Tipo de entidad** — qué tipo de registro fue afectado
- **Registro afectado** — nombre o email del registro modificado
- **Tiempo relativo** — "Hace 5 minutos"
- **Duración** — tiempo de procesamiento en ms

## Ver cambios (antes/después)

Para eventos de actualización, haz clic en **"Ver cambios (antes/después)"** para expandir los detalles:

- **Antes** — valores originales
- **Después** — valores nuevos

Los cambios en arrays (como permisos asignados a un rol) muestran qué se agregó (+) y qué se quitó (−).

## Filtros

Puedes filtrar los registros por:

| Filtro | Descripción |
|---|---|
| **Tipo de entidad** | Member, Branch, Role, Company, Auth, etc. |
| **Acción** | Texto libre que busca en la ruta del endpoint |
| **Período** | Rango de fechas (desde / hasta) |

Los filtros se aplican automáticamente al cambiar los valores.

## Exportar a CSV

Haz clic en **Exportar CSV** para descargar los registros actuales (con los filtros activos) como archivo CSV.

El archivo incluye: fecha, acción, tipo de entidad, usuario, email, estado HTTP e IP.

## Paginación

La auditoría usa paginación por cursor (diferente a las demás secciones):
- Usa los botones **Anterior** y **Siguiente** para navegar
- No puedes saltar directamente a una página — el sistema está optimizado para tablas con millones de registros

## Datos sanitizados

Los campos sensibles como contraseñas y tokens **nunca aparecen** en los registros de auditoría. Se muestran como `••••••••` ([REDACTED]).
