# `useFilterSync`

Conecta un objeto reactivo de filtros con `store.applyFilters()` usando un único watcher profundo con debounce.

## Problema que resuelve

El antipatrón que reemplaza es crear un watcher por cada filtro:

```ts
// ❌ Antes — fácil olvidar alguno → "filtro muerto" que no dispara fetch
watch(() => filterValues.value.search, () => store.applyFilters({ search: ... }))
watch(() => filterValues.value.status, () => store.applyFilters({ status: ... }))
watch(() => filterValues.value.roleId, () => store.applyFilters({ roleId: ... }))
```

El bug clásico: agregar un nuevo filtro y olvidar su watcher. El filtro visualmente "funciona" pero nunca dispara el fetch.

```ts
// ✅ Ahora — un watcher profundo para TODOS los filtros
useFilterSync(filterValues, v => store.applyFilters({
  search: v.search || undefined,
  status: v.status || undefined,
  roleId: v.roleId || undefined,
}))
```

## API

```ts
function useFilterSync<T extends object>(
  values: Ref<T>,
  apply: (values: T) => unknown | Promise<unknown>,
  delay?: number
): { applyDebounced: () => void }
```

| Parámetro | Descripción |
|---|---|
| `values` | Ref al objeto de filtros (ej: `ref({ search: '', status: '' })`) |
| `apply` | Función que recibe los valores actuales y llama a `store.applyFilters()` |
| `delay` | Debounce en ms (default: **350ms**) |

## Patrón canónico

```ts
// 1. Definir valores reactivos de filtros (fuera del store)
const filterValues = ref({ search: '', roleId: '', status: '' })

// 2. Resetear filtros al cambiar de empresa
watch(companyId, (newId, oldId) => {
  if (newId !== oldId && newId) {
    filterValues.value = { search: '', roleId: '', status: '' }
  }
})

// 3. Conectar con el store — un watcher para todos los filtros
useFilterSync(filterValues, v => store.applyFilters({
  search: emptyToUndefined(v.search),
  status: v.status || undefined,
  roleId: v.roleId || undefined,
}))
```

## Integración con `UiTableFilters`

```vue
<UiTableFilters v-model="filterValues" :filters="filterDefs" />
```

El `v-model` de `UiTableFilters` actualiza `filterValues`, el watcher de `useFilterSync` lo detecta, debounce de 350ms, y llama a `store.applyFilters()`.

## Los errores se suprimen intencionalmente

`useFilterSync` no maneja errores de `apply()`. Los errores del fetch viven en `store.error` y los muestra la vista via `UiDataTable :error="store.error"`. Esto evita duplicar el manejo de errores.

## `emptyToUndefined()`

Convierte strings vacíos a `undefined` para no enviar filtros vacíos al backend:

```ts
import { emptyToUndefined } from '@/utils/text'

// '' → undefined, 'texto' → 'texto'
useFilterSync(filterValues, v => store.applyFilters({
  search: emptyToUndefined(v.search),
}))
```
