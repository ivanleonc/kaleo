# UiSelect

Select nativo con opciones tipadas.

## Props

| Prop | Tipo | Default | Descripcion |
|---|---|---|---|
| `label` | string | — | Etiqueta visible |
| `options` | `{ label: string; value: string }[]` | `[]` | Opciones |
| `placeholder` | string | — | Opcion con valor vacio al inicio |
| `disabled` | boolean | `false` | Deshabilita |
| `required` | boolean | `false` | Campo obligatorio |
| `error` | `string\|null` | `null` | Mensaje de error |

## Model

`v-model: string`  

## Ejemplo

```vue
<UiSelect
  v-model="editForm.status"
  label="Estado de la Cuenta"
  :options="statusOptions"
/>

<script>
const statusOptions = [
  { label: 'Activo', value: 'active' },
  { label: 'Inactivo', value: 'inactive' }
]
</script>
```
