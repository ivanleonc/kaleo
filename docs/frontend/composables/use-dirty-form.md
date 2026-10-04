# `useDirtyForm`

Detecta cambios sin guardar en un formulario usando comparación de snapshot JSON.

## Problema que resuelve

Sin `useDirtyForm`, al cerrar un modal con cambios sin guardar, el usuario pierde su trabajo silenciosamente. Con `useDirtyForm` + `UiFormModal confirmOnDirty`, aparece un diálogo de confirmación.

## API

```ts
function useDirtyForm<T>(selector: () => T): {
  isDirty:  ComputedRef<boolean>
  snapshot: Ref<string>
  capture:  () => void
  reset:    () => void
  clear:    () => void
}
```

### `selector`

Función que retorna el estado actual del formulario. Se evalúa reactivamente:

```ts
const { isDirty, capture } = useDirtyForm(() => ({
  name: form.name,
  email: form.email,
  roleIds: [...form.roleIds],  // spread para comparar por valor, no referencia
}))
```

::: tip
Usa spread (`[...arr]`) en arrays para que la comparación funcione correctamente. Sin spread, `JSON.stringify` de un array reactivo puede producir el mismo string aunque sus elementos hayan cambiado.
:::

### Métodos

| Método | Qué hace | Cuándo llamar |
|---|---|---|
| `capture()` | Guarda el estado actual como snapshot de referencia | En `openModal()` — antes de abrir |
| `reset()` | Actualiza el snapshot al estado actual (no cierra el modal) | Post-guardado si el modal sigue abierto |
| `clear()` | Limpia el snapshot → `isDirty` siempre `false` | Para forzar cierre sin confirmación |

### `isDirty`

Computed que compara `JSON.stringify(selector())` con el snapshot capturado:

```ts
const isDirty = computed(
  () => JSON.stringify(selector()) !== snapshot.value
)
```

`true` = hay cambios sin guardar. `false` = el formulario está igual que cuando se abrió.

## Ciclo de vida típico

```ts
const { isDirty, capture } = useDirtyForm(() => ({ ...form }))

// 1. Abrir modal — capturar estado inicial
const openEditModal = (item: Member) => {
  form.name = item.name
  form.email = item.email
  memberStore.error = null
  capture()          // ← guarda el estado como referencia
  editModal.open(item)
}

// 2. El usuario edita campos — isDirty se actualiza automáticamente

// 3. Guardar — cerrar modal (sin dirty porque ya guardamos)
const handleSubmit = async () => {
  await store.updateMember(form)
  editModal.close()
  toast.success('Guardado correctamente')
  // No necesitas llamar clear() — el modal está cerrado
}
```

## Integración con `UiFormModal`

```vue
<UiFormModal
  v-model="isEditModalOpen"
  title="Editar Miembro"
  :dirty="isDirty"
  :confirm-on-dirty="true"
  @submit="handleSubmit"
>
  <!-- Si el usuario intenta cerrar con isDirty=true,
       UiFormModal muestra: "Tienes cambios sin guardar. ¿Cerrar de todos modos?" -->
</UiFormModal>
```

## Múltiples formularios en la misma view

```ts
// Formulario de crear
const { isDirty: isAddDirty, capture: captureAddForm } = useDirtyForm(() => ({
  name: addForm.name,
  email: addForm.email,
}))

// Formulario de editar
const { isDirty: isEditDirty, capture: captureEditForm } = useDirtyForm(() => ({
  name: editForm.name,
  roleIds: [...editForm.roleIds],
}))
```
