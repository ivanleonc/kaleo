# `useModal`

Gestiona el estado de un modal con tipado genérico — reemplaza los pares `ref(false)` + `ref(null)` manuales.

## Problema que resuelve

```ts
// ❌ Antes — 8 refs para 3 modales
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const editTarget = ref<Member | null>(null)
const isDeleteModalOpen = ref(false)
const deleteTarget = ref<{ id: string; name: string } | null>(null)
// ... más refs para controlar animaciones y limpieza

// ✅ Ahora — 3 modales limpios y tipados
const addModal = useModal()
const editModal = useModal<Member>()
const deleteModal = useModal<{ id: string; name: string }>()
```

## API

```ts
function useModal<T = null>(): {
  isOpen:  Ref<boolean>
  target:  Ref<T | null>
  open:    (item?: T) => void
  close:   () => void
  reset:   () => void
}
```

### `open(item?)`

Establece `target` y abre el modal:

```ts
editModal.open(member)       // target = member, isOpen = true
deleteModal.open({ id, name })
addModal.open()               // sin target
```

### `close()` vs `reset()`

| Método | `isOpen` | `target` | Cuándo usar |
|---|---|---|---|
| `close()` | `false` | Sin cambio | Cierre con animación de salida (target necesario hasta que termina) |
| `reset()` | `false` | `null` | Cierre definitivo, limpia el target |

```ts
// Tras confirmar borrado exitoso — limpiar el target
const confirmDelete = async () => {
  await store.removeMember(deleteTarget.value!.id)
  deleteModal.reset()  // ← isOpen=false + target=null
  toast.success('Miembro eliminado')
}
```

## Ejemplo con múltiples modales

```ts
const authStore = useAuthStore()

// Modal de crear (sin target)
const addModal = useModal()
const isAddModalOpen = addModal.isOpen

// Modal de editar (con target tipado)
const editModal = useModal<Member>()
const isEditModalOpen = editModal.isOpen

// Modal de confirmar borrado
const deleteModal = useModal<{ id: string; name: string }>()
const isDeleteModalOpen = deleteModal.isOpen
const deleteTarget = deleteModal.target

function openEditModal(member: Member) {
  if (authStore.user?.id === member.id) {
    toast.error('No puedes modificar tu propio perfil')
    return
  }
  store.error = null
  editModal.open(member)  // target = member
}

function openDeleteModal(member: Member) {
  store.error = null
  deleteModal.open({ id: member.id, name: member.name })
}
```

## Integración con UiFormModal

```vue
<UiFormModal
  v-model="isEditModalOpen"
  :title="`Editando: ${editModal.target.value?.name}`"
  :dirty="isDirty"
  :confirm-on-dirty="true"
  @submit="handleEditSubmit"
>
  <!-- form body -->
</UiFormModal>
```

## Integración con UiConfirmDialog

```vue
<UiConfirmDialog
  v-model="isDeleteModalOpen"
  title="Eliminar Miembro"
  :loading="store.isLoading"
  :error="store.error"
  @confirm="confirmDelete"
>
  ¿Eliminar a <strong>{{ deleteTarget?.name }}</strong>?
</UiConfirmDialog>
```
