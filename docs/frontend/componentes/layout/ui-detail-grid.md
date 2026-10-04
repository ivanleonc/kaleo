# UiDetailGrid

Contenedor semántico para grupos de pares label/valor en vistas de detalle.

## Props

Ninguna.

## Slots

| Slot | Descripción |
|---|---|
| default | Una o más instancias de `UiInfoRow` |

## Uso

Siempre se usa junto con `UiInfoRow`:

```vue
<UiDetailGrid>
  <UiInfoRow label="Nombre">{{ company.name }}</UiInfoRow>
  <UiInfoRow label="Tax ID">{{ company.tax_id || 'No configurado' }}</UiInfoRow>
  <UiInfoRow label="Estado">
    <UiBadge :variant="company.is_active ? 'success' : 'danger'">
      {{ company.is_active ? 'Activa' : 'Inactiva' }}
    </UiBadge>
  </UiInfoRow>
  <UiInfoRow label="Zona Horaria">{{ company.timezone || 'No configurada' }}</UiInfoRow>
</UiDetailGrid>
```

## Notas

- Reemplaza el patrón `div.info-grid` + `div.info-row` que estaba duplicado en `SettingsView` y `ProfileView`
- El borde inferior de `UiInfoRow` desaparece en el último hijo (via `:last-child`)
- Para contenido más largo o que no cabe en una línea, el valor hace wrap automáticamente
