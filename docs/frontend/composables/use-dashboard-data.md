# `useDashboardData`

Ejecuta múltiples fetches en paralelo con un único estado de loading/error compartido.

## Cuándo usarlo

Cuando un dashboard necesita datos de **múltiples fuentes** y quieres:
- Un solo `isLoading` para todos
- Que el fallo de uno no bloquee a los demás
- Resultados completamente tipados según cada fetcher

## Diferencia con `useAsyncData`

| | `useAsyncData` | `useDashboardData` |
|---|---|---|
| Fetchers | 1 | N (objeto clave/valor) |
| Fallo parcial | Todo o nada | `allSettled` — los demás siguen |
| Tipado | `T \| null` | `{ key: ReturnType<fetcher> \| null }` |
| Cuándo usar | Una fuente de datos | Múltiples fuentes independientes |

## API

```ts
function useDashboardData<T extends FetcherMap>(
  fetchers: T,
  options?: UseDashboardDataOptions
): {
  results: Ref<FetcherResults<T>>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  reload: () => Promise<void>
}
```

### `fetchers`

Un objeto donde cada clave es un nombre descriptivo y el valor es una función que retorna una Promise:

```ts
{
  members:  () => memberService.getMembers({ limit: 1 }),
  branches: () => branchService.getBranches({ limit: 1 }),
  revenue:  () => invoiceService.getSummary(),
}
```

### `results`

Completamente tipado según los fetchers. Si `members` retorna `MembersResponse`, entonces `results.value.members` es `MembersResponse | null`:

```ts
const { results } = useDashboardData({
  members: () => memberService.getMembers({ limit: 1 }),
})

// results.value.members → MembersResponse | null
results.value.members?.total  // number | undefined
```

### Opciones

| Opción | Tipo | Default | Descripción |
|---|---|---|---|
| `watch` | `Ref \| ComputedRef` | — | Re-ejecuta todos los fetchers cuando cambia |
| `immediate` | `boolean` | `true` | Carga en `onMounted` |
| `errorMessage` | `string` | `'Error al cargar los datos del dashboard'` | Mensaje si todos fallan |

## Ejemplo — DashboardView actual

```ts
const { results, isLoading, error, reload } = useDashboardData(
  {
    allMembers:    () => memberService.getMembers({ page: 1, limit: 1 }),
    activeMembers: () => memberService.getMembers({ page: 1, limit: 1, status: 'active' }),
    roles:         () => roleService.getRoles(),
  },
  { watch: companyId }
)

// Computed que leen los resultados tipados
const totalMembers  = computed(() => results.value.allMembers?.total ?? 0)
const activeMembers = computed(() => results.value.activeMembers?.total ?? 0)
const totalRoles    = computed(() => results.value.roles?.length ?? 0)
```

## Fallos parciales

`useDashboardData` usa `Promise.allSettled` internamente. Si un fetcher falla:
- Su resultado queda en `null`
- Los demás fetchers siguen mostrando sus datos
- Se emite un `console.warn` con el nombre del fetcher fallido
- El `error` principal solo se establece si **todos** fallan

```ts
// Si 'revenue' falla pero 'members' tiene datos:
results.value.members  // → MembersResponse (datos válidos)
results.value.revenue  // → null (failed)
error.value            // → null (no todos fallaron)
```

## Template

```vue
<template>
  <div class="metrics-grid">
    <UiMetricCard
      title="Miembros Activos"
      :value="activeMembers"
      :loading="isLoading"
    >
      <template #icon><IconUsers /></template>
    </UiMetricCard>

    <UiMetricCard
      title="Roles"
      :value="totalRoles"
      :loading="isLoading"
    >
      <template #icon><IconShield /></template>
    </UiMetricCard>
  </div>

  <UiErrorState v-if="error" :description="error" @retry="reload" />
</template>
```
