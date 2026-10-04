# UiToast

Sistema de notificaciones transitorias. No se usa directamente — usa el composable `useToast()`.

## `useToast()` API

```ts
import { useToast } from '@/composables/useToast'

const toast = useToast()

// Tipos básicos
toast.success('Sede creada correctamente')
toast.error('No se pudo guardar')
toast.warning('Los cambios no serán permanentes')

// Con acción inline (sticky — no desaparece automáticamente)
toast.withAction(
  'success',
  'Sede desactivada',
  {
    label: 'Deshacer',
    onClick: () => branchStore.updateBranch(id, { is_active: true })
  }
)
```

## Comportamiento

- Máximo **3 toasts** visibles simultáneamente
- Los toasts básicos desaparecen automáticamente después de ~4 segundos
- Los toasts con acción (`withAction`) son **sticky** — persisten hasta que el usuario los cierra o hace clic en la acción
- Aparecen en la esquina inferior derecha de la pantalla
- El componente `UiToast.vue` está montado globalmente en `App.vue`

## Cuándo usar toast vs `UiAlert`

| Situación | Componente |
|---|---|
| Confirmar que una operación fue exitosa | `toast.success()` |
| Error transitorio en una operación CRUD | `toast.error()` |
| Ofrecer una acción de "Deshacer" | `toast.withAction()` |
| Error persistente en un formulario | `<UiAlert type="error">` |
| Aviso informativo dentro de un form | `<UiAlert type="info">` |
| Estado de error al cargar datos | `<UiErrorState>` |
