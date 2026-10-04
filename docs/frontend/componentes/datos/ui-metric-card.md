# UiMetricCard

Tarjeta de KPI para dashboards. Muestra un valor grande con icono, título y texto de tendencia.

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `title` | string | Requerido | Etiqueta de la métrica |
| `value` | `string \| number` | Requerido | Valor principal (se muestra grande) |
| `trendText` | string | — | Texto de tendencia (ej: `"De un total de 50"`) |
| `trendType` | `'positive' \| 'neutral' \| 'negative'` | `'neutral'` | Color del trendText |
| `color` | `'purple' \| 'blue' \| 'green' \| 'orange'` | `'purple'` | Color del fondo del ícono |
| `isText` | boolean | `false` | Activa ellipsis y reduce fuente para valores de texto largo |
| `loading` | boolean | `false` | Muestra skeleton mientras carga |

## Slot

| Slot | Descripción |
|---|---|
| `#icon` | Ícono de Tabler o SVG (tamaño recomendado: 18-20px) |

## Ejemplo

```vue
<div class="metrics-grid">
  <router-link :to="companyPath('/members')" class="metric-link">
    <UiMetricCard
      title="Miembros Activos"
      :value="activeMembers"
      :trend-text="`De un total de ${totalMembers}`"
      :trend-type="activeMembers > 0 ? 'positive' : 'neutral'"
      color="blue"
      :loading="isLoading"
    >
      <template #icon>
        <IconUsers :size="20" stroke-width="2" />
      </template>
    </UiMetricCard>
  </router-link>

  <UiMetricCard
    title="Empresa Actual"
    :value="activeCompanyName"
    trend-text="Administrador Principal"
    color="green"
    is-text
    :loading="isLoading"
  >
    <template #icon>
      <IconBuildingStore :size="20" stroke-width="2" />
    </template>
  </UiMetricCard>
</div>
```

## Estado de carga

Cuando `loading=true`, muestra skeletons para el icono, título y valor:

```vue
<!-- Siempre mostrar la card (con skeleton) durante la carga -->
<UiMetricCard title="..." :value="0" :loading="isLoading">
  <template #icon><IconReceipt /></template>
</UiMetricCard>
```

## Grid recomendado

```css
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}
```
