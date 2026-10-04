# UiFormModal

El componente más usado en el proyecto. Encapsula `UiModal` + `UiCard` + protección de cambios sin guardar.

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `title` | string | `''` | Título del modal |
| `description` | string | `''` | Subtítulo descriptivo |
| `size` | `'small' \| 'default' \| 'large'` | `'default'` | Tamaño del modal |
| `dirty` | boolean | `false` | Si hay cambios sin guardar |
| `confirmOnDirty` | boolean | `false` | Muestra confirmación al cerrar con cambios |
| `confirmMessage` | string | `'Tienes cambios sin guardar. ¿Cerrar de todos modos?'` | Mensaje del diálogo de confirmación |
| `submitLabel` | string | `'Guardar'` | Texto del botón de envío (footer por defecto) |
| `cancelLabel` | string | `'Cancelar'` | Texto del botón de cancelar (footer por defecto) |
| `loading` | boolean | `false` | Estado loading del botón de envío |
| `hideFooter` | boolean | `false` | Oculta el footer completamente |

## Model

`v-model: boolean` — controla si el modal está abierto

## Emits

| Evento | Descripción |
|---|---|
| `submit` | Cuando el formulario se envía (via `@submit.prevent`) |

## Slots

| Slot | Scope | Descripción |
|---|---|---|
| `#header` | — | Reemplaza el header título/descripción |
| default | — | Cuerpo del formulario |
| `#footer` | `{ requestClose }` | Footer personalizado. Si no se provee, se usa el footer por defecto. |

## Expone

| Método | Descripción |
|---|---|
| `requestClose()` | Cierra el modal pasando por la validación dirty |

## Footer por defecto

Cuando NO se provee el slot `#footer`, UiFormModal renderiza automáticamente:

```html
<div class="modal-footer">
  <UiButton type="button" variant="outline" @click="requestClose">
    {{ cancelLabel }}
  </UiButton>
  <UiButton type="submit" :loading="loading">
    {{ submitLabel }}
  </UiButton>
</div>
```

## Ejemplos

### Uso simple (footer automático)

```vue
<UiFormModal
  v-model="isOpen"
  title="Nueva Sede"
  description="Agrega una ubicación a tu empresa."
  submit-label="Crear Sede"
  :loading="branchStore.isLoading"
  :dirty="isDirty"
  :confirm-on-dirty="true"
  @submit="handleSubmit"
>
  <UiInput v-model="form.name" label="Nombre" required />
  <UiInput v-model="form.city" label="Ciudad" />
</UiFormModal>
```

### Uso avanzado (footer personalizado)

```vue
<UiFormModal
  v-model="isOpen"
  title="Invitar Miembro"
  size="large"
  :dirty="isAddDirty"
  :confirm-on-dirty="true"
  @submit="handleAddSubmit"
>
  <!-- formulario complejo -->

  <template #footer="{ requestClose }">
    <div class="modal-footer">
      <UiButton type="button" variant="outline" @click="requestClose">
        Cancelar
      </UiButton>
      <UiButton type="submit" :loading="memberStore.isLoading">
        Agregar al Equipo
      </UiButton>
    </div>
  </template>
</UiFormModal>
```

## Integración con `useDirtyForm`

```ts
const { isDirty, capture } = useDirtyForm(() => ({ ...form }))

const openModal = () => {
  form.name = ''
  capture()  // guarda el estado inicial como referencia
  isOpen.value = true
}
```

```vue
<UiFormModal
  v-model="isOpen"
  :dirty="isDirty"
  :confirm-on-dirty="true"  // activa el diálogo de confirmación
  ...
/>
```
