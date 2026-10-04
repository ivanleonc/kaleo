# UiDualListbox

Selector dual de items: disponibles (izquierda) / asignados (derecha). Usado para asignar permisos a roles.

## Props

| Prop | Tipo | Descripcion |
|---|---|---|
| `available` | `{ id: string; label: string; description?: string }[]` | Todos los items disponibles |
| `selected` | `{ id: string; label: string }[]` | Items seleccionados inicialmente |
| `label` | string | Etiqueta del campo |
| `availableLabel` | string | Titulo de la columna izquierda |
| `selectedLabel` | string | Titulo de la columna derecha |

## Model

`v-model: string[]` — IDs de los items asignados

## Ejemplo

```vue
<UiDualListbox
  v-model="form.permissionIds"
  :available="allPermissionItems"
  :selected="allPermissionItems"
  label="Permisos"
  available-label="Disponibles"
  selected-label="Asignados al Rol"
/>
```
