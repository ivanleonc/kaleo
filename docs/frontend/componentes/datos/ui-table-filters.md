# UiTableFilters

Barra de filtros configurable que soporta búsqueda, selects y fechas.

## Props

| Prop | Tipo | Descripción |
|---|---|---|
| `v-model` | `object` | Objeto reactivo con una clave por filtro |
| `filters` | `TableFilterDef[]` | Definiciones de los filtros a mostrar |

## `TableFilterDef`

```ts
interface TableFilterDef {
  key: string               // Clave en el v-model
  type: 'search' | 'select' | 'date'
  label: string             // aria-label del control
  placeholder?: string      // Placeholder del input/select
  options?: { label: string; value: string }[]  // Para type: 'select'
  grow?: boolean            // flex-grow: 1 (para búsqueda)
  min?: string              // Para type: 'date'
  max?: string              // Para type: 'date'
}
```

## Slot escape-hatch

Para filtros complejos (rangos de fecha, multi-select), usa el slot `#filter-{key}`:

```ts
interface FilterSlotScope {
  def: TableFilterDef         // La definición del filtro
  value: string               // Valor actual de esta clave
  values: Record<string, any> // Todos los valores del v-model
  update: (key: string, value: string) => void  // Actualizar un valor
}
```

## Ejemplo completo

```vue
<script setup lang="ts">
const filterValues = ref({ search: '', status: '', from: '', to: '' })

const filterDefs: TableFilterDef[] = [
  {
    key: 'search',
    type: 'search',
    label: 'Buscar miembros',
    placeholder: 'Buscar por nombre o email...',
    grow: true,              // Ocupa el espacio disponible
  },
  {
    key: 'status',
    type: 'select',
    label: 'Filtrar por estado',
    options: [
      { label: 'Todos los estados', value: '' },
      { label: 'Activo', value: 'active' },
      { label: 'Inactivo', value: 'inactive' },
    ],
  },
  // 'from' con slot personalizado para rango de fechas
  { key: 'from', type: 'date', label: 'Desde' },
]
</script>

<template>
  <UiTableFilters v-model="filterValues" :filters="filterDefs">
    <!-- Slot para el filtro 'from' — rango personalizado -->
    <template #filter-from="{ values, update }">
      <div class="filter-dates">
        <input
          :value="values.from"
          type="date"
          @input="update('from', $event.target.value)"
          aria-label="Desde"
        />
        <span>hasta</span>
        <input
          :value="values.to"
          type="date"
          @input="update('to', $event.target.value)"
          aria-label="Hasta"
        />
      </div>
    </template>
  </UiTableFilters>
</template>
```

## Comportamiento

- Muestra un botón **Limpiar** (`IconX`) cuando cualquier filtro tiene valor activo
- Al hacer clic en Limpiar, resetea **todos** los filtros a `''`
- `grow: true` en un filtro lo hace ocupar el espacio restante (ideal para el campo de búsqueda)
- Se integra directamente con `useFilterSync` — no necesitas watchers manuales
