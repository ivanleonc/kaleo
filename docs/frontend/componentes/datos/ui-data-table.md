# UiDataTable

La tabla central del sistema — renderiza cualquier `AppVueTable` de TanStack con skeleton, empty state y error state integrados.

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `table` | `AppVueTable<AppFeatures, TData>` | Requerido | Instancia creada con `useAppTable` o `useTableView` |
| `loading` | `boolean` | `false` | Muestra filas skeleton |
| `skeletonRows` | `number` | `5` | Número de filas skeleton |
| `error` | `string \| null` | `null` | Mensaje de error |
| `errorTitle` | `string` | `'No se pudieron cargar los datos'` | Título en el error state |
| `emptyTitle` | `string` | `'Sin resultados'` | Título en el empty state |
| `emptyDescription` | `string` | `''` | Descripción en el empty state |
| `sticky` | `boolean` | `false` | Cabecera fija con scroll interno |

## Emits

| Evento | Descripción |
|---|---|
| `retry` | Cuando el usuario hace clic en "Reintentar" |

## Slots

| Slot | Scope | Descripción |
|---|---|---|
| `#cell-{columnId}` | `{ row, index, cell, value }` | Renderizado de una celda específica |
| `#empty` | — | Reemplaza todo el empty state |
| `#empty-icon` | — | Solo el ícono del empty state |
| `#empty-action` | — | Solo la acción del empty state |

::: tip Naming del slot de celda
El ID del slot coincide con el `id` definido en las columnas de TanStack. Si la columna tiene `accessor('name', ...)`, el slot es `#cell-name`.
:::

## Comportamiento según estado

| Estado | Comportamiento |
|---|---|
| `loading=true` + sin datos | Muestra filas skeleton |
| `error` + sin datos | Muestra `UiErrorState` con botón de reintentar |
| `error` + con datos | Muestra banner de advertencia encima de la tabla (sin ocultar datos) |
| Sin datos, sin error | Muestra `UiEmptyState` |
| Con datos | Renderiza la tabla normalmente |

## Ejemplo completo

```vue
<UiDataTable
  :table="memberTable"
  :loading="isInitialLoading"
  :error="memberStore.error"
  error-title="No pudimos cargar los miembros"
  :empty-title="memberStore.items.length === 0 ? 'No hay miembros todavía' : 'Sin resultados'"
  empty-description="Invita a tu primera persona al equipo."
  @retry="memberStore.fetchMembers()"
>
  <!-- Celda de nombre con avatar -->
  <template #cell-name="{ row }">
    <div class="user-cell">
      <UiAvatar :src="row.avatar_url" :name="row.name" size="sm" />
      <span>{{ row.name }}</span>
    </div>
  </template>

  <!-- Celda de estado con badge -->
  <template #cell-status="{ row }">
    <UiBadge :variant="row.status === 'active' ? 'success' : 'danger'">
      {{ row.status === 'active' ? 'Activo' : 'Inactivo' }}
    </UiBadge>
  </template>

  <!-- Ícono del empty state -->
  <template #empty-icon>
    <IconUsers :size="48" stroke-width="1.5" />
  </template>

  <!-- Acción del empty state -->
  <template #empty-action>
    <UiButton @click="openAddModal" width="auto">Invitar miembro</UiButton>
  </template>
</UiDataTable>
```

## Nota crítica: `data` debe ser `computed`

TanStack Table solo reacciona a valores reactivos (refs o computed). Si se pasa el array directamente desde un store de Pinia (que desenvuelve los refs), la tabla queda congelada con los datos del mount inicial.

```ts
// ❌ La tabla no se actualiza
data: memberStore.members

// ✅ Correcto — reactivo
data: computed(() => memberStore.members)
```

`useTableView` maneja esto automáticamente.

## Layout responsive

En mobile (< 768px), la tabla se transforma en tarjetas verticales usando `meta.label` de cada columna como etiqueta. Define `label` en el meta de tus columnas para habilitar esto.
