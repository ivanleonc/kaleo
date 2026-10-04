# UiErrorState

Estado de error para cuando una carga de datos falla.

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `title` | string | `'No se pudieron cargar los datos'` | Título del error |
| `description` | string | `'Ocurrió un error inesperado. Inténtalo de nuevo.'` | Descripción (puede ser el mensaje del error) |
| `retryLabel` | string | `'Reintentar'` | Texto del botón |
| `loading` | boolean | `false` | Estado loading del botón de reintentar |

## Emits

| Evento | Descripción |
|---|---|
| `retry` | Usuario hace clic en "Reintentar" |

## Slots

| Slot | Descripción |
|---|---|
| `#icon` | Ícono (default: `IconAlertTriangle` en rojo peligro) |
| `#action` | Reemplaza el botón de reintentar completamente |

## Ejemplos

```vue
<!-- Con error del store -->
<UiErrorState
  v-if="loadError"
  title="No pudimos cargar los roles"
  :description="loadError"
  @retry="fetchData"
/>

<!-- Con useAsyncData -->
<UiErrorState
  v-else-if="error"
  :description="error"
  @retry="reload"
/>

<!-- Sin botón de reintentar (acción personalizada) -->
<UiErrorState title="Sesión expirada" description="Tu sesión ha vencido.">
  <template #action>
    <UiButton @click="router.push('/login')" width="auto">
      Iniciar sesión
    </UiButton>
  </template>
</UiErrorState>
```

## Notas

- `role="alert"` para anuncios de accesibilidad
- El botón de reintentar solo se renderiza cuando hay un listener `@retry` (detección via vnode props)
- `UiDataTable` usa `UiErrorState` cuando `error` tiene valor y no hay filas
