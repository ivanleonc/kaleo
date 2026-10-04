# UiButton

Botón de acción con variantes, loading spinner y control de ancho.

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Tipo HTML del botón |
| `variant` | `'primary' \| 'outline' \| 'danger' \| 'ghost' \| 'link'` | `'primary'` | Variante visual |
| `size` | `'sm' \| 'md'` | `'md'` | Tamaño |
| `width` | `'full' \| 'auto'` | `'full'` | Ancho: `100%` o `fit-content` |
| `loading` | boolean | `false` | Muestra spinner y deshabilita interacción |
| `disabled` | boolean | `false` | Deshabilita el botón |
| `icon` | boolean | `false` | Modo icono: hace width = height (cuadrado) |

## Slot

| Slot | Descripción |
|---|---|
| default | Contenido del botón (texto, icono, o combinación) |

## Variantes

| Variante | Uso típico |
|---|---|
| `primary` | Acción principal (guardar, confirmar, crear) |
| `outline` | Acción secundaria (cancelar, editar) |
| `danger` | Acción destructiva (eliminar) |
| `ghost` | Acción terciaria (ver más, link sutil) |
| `link` | Apariencia de link de texto |

## Ejemplos

```vue
<!-- Botón primario de submit -->
<UiButton type="submit" :loading="store.isLoading">
  Guardar Cambios
</UiButton>

<!-- Botón outline para cancelar -->
<UiButton type="button" variant="outline" @click="requestClose">
  Cancelar
</UiButton>

<!-- Botón de ancho automático con ícono -->
<UiButton v-permission="Permissions.USERS.CREATE" @click="openAddModal" width="auto">
  <IconPlus :size="16" /> Nuevo Miembro
</UiButton>

<!-- Botón solo ícono (cuadrado) -->
<UiButton icon variant="ghost" @click="copyToClipboard">
  <IconCopy :size="16" />
</UiButton>

<!-- Botón peligroso -->
<UiButton variant="danger" @click="handleDelete">
  Eliminar
</UiButton>
```

## Accesibilidad

- Altura mínima de 44px en dispositivos touch (WCAG 2.5.5)
- `disabled` aplica tanto visual como funcionalmente
- El estado `loading` añade `aria-busy="true"` implícitamente
