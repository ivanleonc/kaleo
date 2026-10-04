# UiSkeleton

Placeholder de carga animado para contenido que está siendo obtenido.

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `variant` | `'text' \| 'title' \| 'avatar' \| 'badge' \| 'block'` | `'text'` | Forma del skeleton |
| `width` | string | (auto por variante) | Ancho CSS (ej: `'120px'`, `'50%'`) |
| `height` | string | (auto por variante) | Alto CSS |
| `radius` | string | (auto por variante) | Border radius CSS |

## Dimensiones por variante

| Variante | Ancho default | Alto default | Radius default |
|---|---|---|---|
| `text` | `100%` | `14px` | `--radius-sm` |
| `title` | `100%` | `22px` | `--radius-sm` |
| `avatar` | `32px` | `32px` | `50%` |
| `badge` | `70px` | `20px` | `--radius-full` |
| `block` | `100%` | `min 1rem` | `--radius-sm` |

## Ejemplos

```vue
<!-- Skeleton de texto inline -->
<UiSkeleton variant="text" width="150px" />

<!-- Skeleton de avatar grande -->
<UiSkeleton variant="avatar" width="48px" height="48px" radius="var(--radius-lg)" />

<!-- Skeleton de bloque (card cargando) -->
<UiSkeleton variant="block" height="72px" radius="var(--radius-lg)" />

<!-- Filas de skeleton en una detail grid -->
<UiDetailGrid>
  <div v-for="n in 5" :key="n" class="info-row-skeleton">
    <UiSkeleton variant="text" width="120px" />
    <UiSkeleton variant="text" width="160px" />
  </div>
</UiDetailGrid>
```

## Notas

- Siempre `aria-hidden="true"` — no debe ser anunciado por lectores de pantalla
- La animación de pulse usa `background-size: 200% 100%` con `animation` — no `@keyframes` pesados
- Para skeletons en tablas, usar `loading` prop de `UiDataTable` (genera filas skeleton automáticamente)
