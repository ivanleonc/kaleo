# UiInfoRow

Par label/valor para vistas de detalle. Siempre dentro de `UiDetailGrid`.

## Props

| Prop | Tipo | Requerido | Descripción |
|---|---|---|---|
| `label` | string | ✅ | Etiqueta del campo (columna izquierda) |

## Slots

| Slot | Descripción |
|---|---|
| default | El valor del campo — puede ser texto, badge, avatar, o cualquier elemento inline |

## Ejemplos

```vue
<!-- Valor de texto -->
<UiInfoRow label="Nombre">{{ user.name }}</UiInfoRow>

<!-- Valor como badge -->
<UiInfoRow label="Estado">
  <UiBadge variant="success">Activo</UiBadge>
</UiInfoRow>

<!-- Valor con fallback -->
<UiInfoRow label="Teléfono">{{ user.phone || 'No configurado' }}</UiInfoRow>

<!-- Valor con skeleton en carga -->
<UiInfoRow label="Empresa">
  <UiSkeleton v-if="isLoading" variant="text" width="150px" />
  <span v-else>{{ company?.name }}</span>
</UiInfoRow>
```

## Estilos

- Label: `var(--text-sm)`, color `var(--text-muted)`, font-weight 500
- Valor: `var(--text-sm)`, color `var(--text-main)`, font-weight 600, alineado a la derecha
- Padding: `var(--space-3) 0`
- Separador: `border-bottom: 1px solid var(--border)` (último hijo sin borde)
