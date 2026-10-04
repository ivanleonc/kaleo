# UiSearchInput

Input de busqueda con icono y boton de limpiar.

## Model

`v-model: string`  

## Emits

| Evento | Descripcion |
|---|---|
| `input` | Cuando el valor cambia |
| `clear` | Cuando el usuario limpia el campo |

## Ejemplo

```vue
<UiSearchInput
  v-model="userSearchQuery"
  placeholder="Busca por nombre o email..."
  @input="onSearchInput"
/>
```
