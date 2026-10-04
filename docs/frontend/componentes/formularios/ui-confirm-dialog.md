# UiConfirmDialog

Diálogo modal de confirmación. Para acciones reversibles usa botón `primary`; para destructivas usa `danger`.

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `title` | string | `'Confirmar acción'` | Título del diálogo |
| `confirmLabel` | string | `'Confirmar'` | Texto del botón de confirmación |
| `cancelLabel` | string | `'Cancelar'` | Texto del botón de cancelar |
| `loading` | boolean | `false` | Estado de carga del botón de confirmar |
| `variant` | `'danger' \| 'primary'` | — | Color del botón de confirmar |
| `error` | `string \| null` | `null` | Mensaje de error (muestra `UiAlert`) |
| `requireTypedConfirmation` | `string \| null` | `null` | Texto que el usuario debe escribir exacto para habilitar el botón |

## Model

`v-model: boolean`

## Emits

| Evento | Descripción |
|---|---|
| `confirm` | Cuando el usuario confirma la acción |

## Slot

| Slot | Descripción |
|---|---|
| default | Mensaje de confirmación (puede incluir `<strong>`) |

## Ejemplos

### Confirmación simple

```vue
<UiConfirmDialog
  v-model="isDeleteModalOpen"
  title="Eliminar Sede"
  variant="danger"
  confirm-label="Eliminar"
  :loading="branchStore.isLoading"
  :error="branchStore.error"
  @confirm="confirmDelete"
>
  ¿Estás seguro de que deseas eliminar la sede
  <strong>{{ deletingBranch?.name }}</strong>?
</UiConfirmDialog>
```

### Con confirmación tipada (acciones de alto impacto)

```vue
<!-- El usuario debe escribir el nombre del rol exacto para confirmar -->
<UiConfirmDialog
  v-model="isDeleteRoleModalOpen"
  title="Eliminar Rol"
  variant="danger"
  confirm-label="Eliminar"
  :loading="isSaving"
  :error="errorMsg"
  :require-typed-confirmation="deleteTarget?.name ?? null"
  @confirm="handleDeleteSubmit"
>
  ¿Estás seguro de eliminar el rol <strong>{{ deleteTarget?.name }}</strong>?
  Esta acción no se puede deshacer y quitará el acceso a los miembros.
</UiConfirmDialog>
```

Cuando `requireTypedConfirmation="Admin"`, el modal muestra un input donde el usuario debe escribir exactamente "Admin". El botón de confirmar se habilita solo cuando el texto coincide.

## Cuándo usar `requireTypedConfirmation`

Usa esta funcionalidad para acciones que:
- Son **irreversibles** (eliminar un rol, borrar datos permanentemente)
- Tienen **consecuencias amplias** (afectan a múltiples usuarios)
- Requieren que el usuario **confirme conscientemente** lo que está haciendo
