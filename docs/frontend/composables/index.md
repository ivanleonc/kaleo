# Composables — Índice

Los composables son funciones reutilizables que encapsulan lógica reactiva. En Kaleo, son el **núcleo de la arquitectura frontend**: eliminan boilerplate, garantizan consistencia y permiten crear nuevos módulos en minutos.

## Composables core

| Composable | Archivo | Propósito | Uso típico |
|---|---|---|---|
| `usePaginatedSetup` | `createPaginatedStore.ts` | Factory de stores con paginación, filtros y sort server-side | Dentro de `defineStore()` para cualquier lista paginada |
| `createPaginatedStore` | `createPaginatedStore.ts` | Genera un store completo de solo lectura | Para listas sin CRUD |
| `useTableView` | `useTableView.ts` | Configura una tabla TanStack en 1 línea | En cada view con `UiDataTable` |
| `useAsyncData` | `useAsyncData.ts` | Carga datos no-paginados con loading/error/reload automáticos | Dashboard, Settings, detalle de entidad |
| `useDashboardData` | `useDashboardData.ts` | Múltiples fetches paralelos con estado unificado | Dashboards multi-métrica |

## Formularios y modales

| Composable | Archivo | Propósito |
|---|---|---|
| `useModal<T>` | `useModal.ts` | Estado tipado de modal (isOpen, target, open/close/reset) |
| `useDirtyForm` | `useDirtyForm.ts` | Detecta cambios sin guardar via snapshot JSON |
| `useAsyncOperation` | `useAsyncOperation.ts` | isLoading + error compartidos para operaciones CRUD en stores |

## Datos y filtros

| Composable | Archivo | Propósito |
|---|---|---|
| `useFilterSync` | `useFilterSync.ts` | Sincroniza objeto de filtros con `store.applyFilters()` con debounce |
| `useAppTable` | `useAppTable.ts` | Wrapper de TanStack Table v9 con convenciones del proyecto |

## UI y experiencia

| Composable | Archivo | Propósito |
|---|---|---|
| `useToast` | `useToast.ts` | Sistema de notificaciones toast (success, error, warning, withAction) |
| `useTheme` | `useTheme.ts` | Toggle dark/light mode, persiste en localStorage |
| `useCreateAction` | `useCreateAction.ts` | Registra `?crear=1` en URL para abrir modal desde la paleta de comandos |
| `useOnlineStatus` | `useOnlineStatus.ts` | Detecta online/offline del navegador |
| `useClipboard` | `useClipboard.ts` | Copiar texto al portapapeles |
| `useDebounceFn` | `useDebounceFn.ts` | Envuelve cualquier función con debounce |

## Navegación

| Composable | Archivo | Propósito |
|---|---|---|
| `useCompanyPath` | `useCompanyPath.ts` | Lee `:companyId` de la ruta y construye URLs tenantizadas |

## Reglas de uso

1. **Un composable por concepto** — no mezclar lógica de tabla con lógica de modal
2. **Los composables no modifican stores directamente** — reciben callbacks o trabajan con stores inyectados
3. **Retornan siempre refs/computed** — para que los templates sean reactivos
4. **Documentan el "porqué"** — no solo el "qué" — con JSDoc

## Patrón de una view completa

```ts
// Vista estándar con todos los composables activos
const store = useInvoiceStore()
const { companyId } = useCompanyPath()

// Tabla
const { table, isInitialLoading } = useTableView(useInvoiceColumns(), store)

// Filtros
const filterValues = ref({ search: '', status: '' })
watch(companyId, () => { filterValues.value = { search: '', status: '' } })
useFilterSync(filterValues, v => store.applyFilters({ search: v.search || undefined }))

// Modales
const createModal = useModal()
const editModal = useModal<Invoice>()
const deleteModal = useModal<{ id: string; number: string }>()

// Formulario
const form = reactive({ number: '', amount: 0 })
const { isDirty, capture } = useDirtyForm(() => ({ ...form }))

// Acciones
onMounted(() => store.fetchInvoices())
useCreateAction(() => openCreateModal())
```
