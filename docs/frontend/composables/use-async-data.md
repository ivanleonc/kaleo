# `useAsyncData`

Carga datos asíncrona con estado de loading/error y recarga automática cuando cambia una dependencia.

## Problema que resuelve

Este patrón de ~20 líneas aparece en Dashboard, Settings, Profile, y en cualquier vista de detalle:

```ts
// ❌ Antes — ~20 líneas en cada vista
const company = ref<CompanyDetail | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

const loadCompanyData = async () => {
  if (!companyId.value) return
  isLoading.value = true
  error.value = null
  try {
    const result = await companyService.getCompany(companyId.value)
    company.value = result.data
  } catch (err) {
    error.value = apiErrorMessage(err, 'No pudimos cargar la empresa')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadCompanyData)
watch(() => authStore.activeTenantId, () => {
  company.value = null
  loadCompanyData()
})
```

Con `useAsyncData`:

```ts
// ✅ Ahora — 1–5 líneas
const { data: company, isLoading, error, reload } = useAsyncData(
  async () => {
    if (!companyId.value) return null
    const result = await companyService.getCompany(companyId.value)
    return result.data
  },
  { watch: computed(() => authStore.activeTenantId) }
)
```

## API

```ts
function useAsyncData<T>(
  fetcher: () => Promise<T>,
  options?: UseAsyncDataOptions
): UseAsyncDataReturn<T>
```

### Opciones

| Opción | Tipo | Default | Descripción |
|---|---|---|---|
| `watch` | `Ref \| ComputedRef` | — | Re-ejecuta el fetcher cuando cambia el valor |
| `immediate` | `boolean` | `true` | Ejecuta en `onMounted` automáticamente |
| `errorMessage` | `string` | `'Error al cargar los datos'` | Mensaje genérico si el fetcher lanza sin mensaje API |
| `onBeforeFetch` | `() => void` | — | Callback antes de cada fetch (ej: limpiar estado local) |

### Retorno

| Propiedad | Tipo | Descripción |
|---|---|---|
| `data` | `Ref<T\|null>` | Los datos cargados. `null` hasta que carguen o si hay error. |
| `isLoading` | `Ref<boolean>` | `true` mientras el fetcher está en vuelo |
| `error` | `Ref<string\|null>` | Mensaje del último error. `null` si fue exitoso. |
| `reload` | `() => Promise<void>` | Re-ejecuta el fetcher manualmente |

## Comportamiento con `watch`

Cuando cambia la dependencia `watch`, el composable:
1. Limpia `data.value = null` (previene flash de datos de la empresa anterior)
2. Vuelve a ejecutar el fetcher

```ts
// Al cambiar de empresa, 'data' se limpia antes de mostrar los nuevos datos
const { data: metrics } = useAsyncData(
  () => service.getMetrics(companyId.value),
  { watch: companyId }  // se re-ejecuta cuando companyId cambia
)
```

## Ejemplos

### Vista de configuración (empresa activa)

```ts
const { data: company, isLoading, error, reload } = useAsyncData(
  async () => {
    if (!companyId.value) return null
    const res = await companyService.getCompany(companyId.value)
    return res.data as CompanyDetail
  },
  {
    watch: computed(() => authStore.activeTenantId),
    onBeforeFetch: () => { companyStore.error = null },
    errorMessage: 'No pudimos cargar la empresa',
  }
)
```

### Vista de detalle (parámetro de ruta)

```ts
const route = useRoute()
const invoiceId = computed(() => route.params.id as string)

// Se recarga automáticamente si el ID cambia en la URL
const { data: invoice, isLoading, error, reload } = useAsyncData(
  () => invoiceService.getOne(invoiceId.value),
  { watch: invoiceId }
)
```

### Dashboard con múltiples fetches (usar `useDashboardData` para esto)

```ts
// Si TODOS los fetches comparten el mismo estado de loading, preferir useDashboardData.
// Si necesitas controlar cada fetch por separado, usa useAsyncData con Promise.all:
const { data: metrics, isLoading, error } = useAsyncData(
  async () => {
    const [members, roles] = await Promise.all([
      memberService.getMembers({ limit: 1 }),
      roleService.getRoles(),
    ])
    return { totalMembers: members.total, totalRoles: roles.length }
  },
  { watch: companyId }
)
```

### Sin carga automática

```ts
const { data, isLoading, reload } = useAsyncData(
  () => searchService.search(query.value),
  { immediate: false }  // No cargar al mount — solo cuando se llame reload()
)

// Llamar manualmente cuando sea necesario
async function onSearch() {
  await reload()
}
```

## Template estándar con useAsyncData

```vue
<template>
  <!-- Skeleton durante la primera carga -->
  <template v-if="isLoading">
    <UiCard>
      <UiDetailGrid>
        <div v-for="n in 4" :key="n" class="info-row-skeleton">
          <UiSkeleton variant="text" width="120px" />
          <UiSkeleton variant="text" width="180px" />
        </div>
      </UiDetailGrid>
    </UiCard>
  </template>

  <!-- Error con botón de reintentar -->
  <UiErrorState
    v-else-if="error"
    :description="error"
    @retry="reload"
  />

  <!-- Contenido cargado -->
  <template v-else-if="company">
    <UiCard>
      <UiDetailGrid>
        <UiInfoRow label="Nombre">{{ company.name }}</UiInfoRow>
        <UiInfoRow label="Email">{{ company.email }}</UiInfoRow>
      </UiDetailGrid>
    </UiCard>
  </template>
</template>
```
