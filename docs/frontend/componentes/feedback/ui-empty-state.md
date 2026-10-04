# UiEmptyState

Estado vacío para listas sin resultados.

## Props

| Prop | Tipo | Requerido | Descripción |
|---|---|---|---|
| `title` | string | ✅ | Título del estado vacío |
| `description` | string | — | Descripción adicional |

## Slots

| Slot | Descripción |
|---|---|
| `#icon` | Ícono principal (default: `IconInbox` 48px) |
| `#action` | Botón o acción CTA |

## Ejemplo

```vue
<UiEmptyState
  title="No hay sedes todavía"
  description="Agrega tu primera ubicación para empezar."
>
  <template #icon>
    <IconBuildingCommunity :size="48" stroke-width="1.5" />
  </template>
  <template #action>
    <UiButton
      v-permission="Permissions.BRANCHES.CREATE"
      width="auto"
      @click="openCreateModal"
    >
      <IconPlus :size="16" /> Nueva Sede
    </UiButton>
  </template>
</UiEmptyState>
```

## Notas

- `role="status"` para anunciar el estado a lectores de pantalla
- `UiDataTable` pasa automáticamente los slots `#empty-icon` y `#empty-action` al `UiEmptyState` interno
- Usa un ícono de dominio específico (IconUsers para miembros, IconBuildingCommunity para sedes) para contextualizar
