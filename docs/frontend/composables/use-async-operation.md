# `useAsyncOperation`

Estado compartido de loading/error para operaciones CRUD en stores.

## Propósito

Elimina los `ref(false)` de loading manual en métodos de store:

```ts
// ❌ Sin useAsyncOperation
const isLoading = ref(false)
const error = ref<string | null>(null)

const createBranch = async (payload) => {
  isLoading.value = true
  error.value = null
  try {
    const res = await branchService.createBranch(payload)
    return res.data
  } catch (err) {
    error.value = apiErrorMessage(err, 'Error al crear')
    throw err
  } finally {
    isLoading.value = false
  }
}

// ✅ Con useAsyncOperation (o withLoading de usePaginatedSetup)
const { isLoading, error, execute } = useAsyncOperation({ errorMessage: 'Error' })

const createBranch = async (payload) => {
  return execute(async () => {
    const res = await branchService.createBranch(payload)
    return res.data
  }, 'Error al crear la sede')
}
```

## API

```ts
function useAsyncOperation(options?: UseAsyncOptions): {
  isLoading: Ref<boolean>
  error:     Ref<string | null>
  execute:   <T>(fn: () => Promise<T>, errorMessage?: string) => Promise<T | undefined>
  reset:     () => void
}
```

### Opciones

| Opción | Tipo | Default | Descripción |
|---|---|---|---|
| `errorMessage` | `string` | `'Error en la operación'` | Mensaje genérico si el error no tiene mensaje API |
| `rethrow` | `boolean` | `true` | Si `true` (default), re-lanza el error tras capturarlo |

### `execute(fn, errorMessage?)`

- Establece `isLoading=true` y limpia `error`
- Ejecuta `fn()`
- Si falla: extrae el mensaje con `apiErrorMessage()`, lo pone en `error.value`
- Si `rethrow=true` (default): re-lanza el error para que el caller pueda catcharlo
- Siempre ejecuta `isLoading=false` en `finally`

### `rethrow` — comportamiento

```ts
// rethrow: true (default) — el caller puede catch el error
const createBranch = async (payload) => {
  const result = await execute(async () => {
    return branchService.createBranch(payload)
  })
  // Si execute() lanzó, el código aquí no se ejecuta
  return result
}

// rethrow: false — el error se captura silenciosamente en 'error.value'
const { execute } = useAsyncOperation({ rethrow: false })
await execute(() => riskyOperation())
// La operación falló → error.value tiene el mensaje, pero no se re-lanzó
```

## Relación con `withLoading`

`usePaginatedSetup` expone `withLoading` que es el `execute` de `useAsyncOperation`. Para stores con CRUD, no necesitas llamar `useAsyncOperation` directamente:

```ts
// En un store con usePaginatedSetup:
const paginated = usePaginatedSetup<Branch, BranchFilters>({ ... })

// paginated.withLoading ES useAsyncOperation.execute
// Comparten el mismo isLoading y error que la lista paginada
const createBranch = async (payload) => {
  return paginated.withLoading(async () => {
    const res = await branchService.createBranch(payload)
    await paginated.refresh()
    return res.data
  }, 'Error al crear la sede')
}
```

## Cuándo usar `useAsyncOperation` directamente

Solo cuando necesitas un `isLoading`/`error` **separado** del store paginado:

```ts
// Caso: estado de guardado independiente en un modal
const { isLoading: isSaving, error: saveError, execute: executeSave } = useAsyncOperation()

const handleSubmit = async () => {
  await executeSave(async () => {
    await userService.updateProfile(form)
    authStore.updateProfileData(form)
  }, 'Error al guardar el perfil')
  isModalOpen.value = false
  toast.success('Perfil actualizado')
}
```

## Manejo de errores

`execute` usa `apiErrorMessage(err, fallback)` para extraer el mensaje:

1. Si el error viene de la API con `{ message }` → usa ese mensaje
2. Si el error es un Error de red/timeout → usa el `fallback`
3. El resultado va a `error.value` y se muestra via `UiAlert` en el template

```vue
<!-- Mostrar error del execute en el modal -->
<UiAlert v-if="store.error" type="error">{{ store.error }}</UiAlert>
```
