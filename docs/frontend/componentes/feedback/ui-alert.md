# UiAlert

Componente de alerta para mensajes de feedback inline (no toast).

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `type` | `'error' \| 'success' \| 'info' \| 'warning'` | `'error'` | Tipo visual de la alerta |

## Slots

| Slot | Descripción |
|---|---|
| default | Contenido del mensaje |
| `#icon` | Reemplaza el ícono por defecto |
| `#title` | Título en negrita sobre el mensaje |

## Íconos por defecto

| Tipo | Ícono |
|---|---|
| `error` | `IconAlertCircle` (rojo) |
| `success` | `IconCircleCheck` (verde) |
| `warning` | `IconAlertTriangle` (amarillo) |
| `info` | `IconInfoCircle` (azul) |

## Ejemplos

```vue
<!-- Error en formulario -->
<UiAlert v-if="store.error" type="error">{{ store.error }}</UiAlert>

<!-- Aviso informativo -->
<UiAlert type="info">
  Si guardas este cambio, recibirás un enlace de verificación
  en la nueva dirección antes de que se active.
</UiAlert>

<!-- Advertencia con título -->
<UiAlert type="warning">
  <template #title>Cambio de URL</template>
  Cambiar el identificador actualizará la URL de la empresa.
  Los enlaces anteriores dejarán de funcionar.
</UiAlert>

<!-- Con ícono personalizado -->
<UiAlert type="info">
  <template #icon><IconLock :size="16" /></template>
  Esta acción requiere verificación adicional.
</UiAlert>
```

## Notas

- Tiene `role="alert"` para anuncios de accesibilidad
- Usa tokens de color: `--color-{type}`, `--color-{type}-bg`, `--color-{type}-border`, `--color-{type}-text`
- No usar para notificaciones transitorias — para eso usar `useToast()`
