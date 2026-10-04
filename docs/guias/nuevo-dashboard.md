# Crear un Dashboard

> **Cuándo usar este patrón:** Vista con métricas, KPIs, y/o gráficas que resumen el estado de la empresa.
> **Referencia viva:** `DashboardView.vue`, `UiMetricCard.vue`

---

## Patrones disponibles

### A. Dashboard simple (métricas numéricas)
Como el Dashboard actual: 4 tarjetas con totales. Usar `useDashboardData`.

### B. Dashboard con gráficas
Mismo que A pero con `UiChart` (ECharts wrapper ya disponible). Requiere un composable de datos para el chart.

### C. Dashboard por módulo
Un mini-dashboard dentro de un módulo (ej. resumen de facturas dentro de Facturación). Usar `useAsyncData`.

---

## Patrón A — Métricas con `useDashboardData`

```ts
// En la view:
const { results, isLoading, error, reload } = useDashboardData(
  {
    invoices:  () => invoiceService.getInvoices({ limit: 1 }),
    overdue:   () => invoiceService.getInvoices({ limit: 1, status: 'overdue' }),
    members:   () => memberService.getMembers({ limit: 1 }),
  },
  { watch: companyId },
);

const totalInvoices = computed(() => results.value.invoices?.total ?? 0);
const overdueCount  = computed(() => results.value.overdue?.total ?? 0);
const memberCount   = computed(() => results.value.members?.total ?? 0);
```

```html
<!-- En el template: -->
<div class="metrics-grid">
  <UiMetricCard
    title="Facturas pendientes"
    :value="totalInvoices"
    :trend-text="`${overdueCount} vencidas`"
    :trend-type="overdueCount > 0 ? 'negative' : 'positive'"
    color="blue"
    :loading="isLoading"
  >
    <template #icon><IconReceipt :size="20" /></template>
  </UiMetricCard>

  <!-- más cards... -->
</div>
```

---

## Patrón B — Métricas + gráficas

```ts
// Datos del gráfico desde el servidor:
const { data: chartData, isLoading: chartLoading } = useAsyncData(
  () => reportService.getMonthlyRevenue(),
  { watch: companyId }
);

// Opciones de ECharts:
const barOptions = computed(() => ({
  xAxis: { data: chartData.value?.months ?? [] },
  yAxis: {},
  series: [{ type: 'bar', data: chartData.value?.amounts ?? [] }],
}));
```

```html
<!-- UiChart ya importado en ui/ -->
<UiChart :option="barOptions" height="300px" :loading="chartLoading" />
```

---

## Patrón C — Mini-dashboard en un módulo

```ts
// Resumen al tope de InvoicesView, antes de la tabla:
const { data: summary, isLoading: summaryLoading } = useAsyncData(
  () => invoiceService.getSummary(), // { total, paid, overdue, pendingAmount }
  { watch: companyId }
);
```

```html
<div class="summary-strip" v-if="summary">
  <UiMetricCard title="Total" :value="summary.total" color="blue" :loading="summaryLoading">
    <template #icon><IconReceipt /></template>
  </UiMetricCard>
  <UiMetricCard title="Pagadas" :value="summary.paid" color="green" :loading="summaryLoading">
    <template #icon><IconCheck /></template>
  </UiMetricCard>
  <UiMetricCard title="Vencidas" :value="summary.overdue" color="orange" :loading="summaryLoading">
    <template #icon><IconAlertCircle /></template>
  </UiMetricCard>
</div>
```

---

## `UiMetricCard` — API completa

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `title` | `string` | — | Etiqueta de la métrica |
| `value` | `string \| number` | — | Valor principal (grande) |
| `trendText` | `string` | — | Texto secundario debajo del valor |
| `trendType` | `'positive' \| 'neutral' \| 'negative'` | `'neutral'` | Color del trendText |
| `color` | `'purple' \| 'blue' \| 'green' \| 'orange'` | `'purple'` | Color del fondo del ícono |
| `isText` | `boolean` | `false` | Para valores de texto largo (activa ellipsis) |
| `loading` | `boolean` | `false` | Muestra skeleton mientras carga |

**Slot:** `#icon` — cualquier ícono de Tabler o SVG

---

## CSS del grid

```css
/* Grids responsivos estándar para dashboards */

/* 4 columnas en desktop, 2 en tablet, 1 en mobile */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}

/* 2 columnas fijas para un mini-dashboard */
.summary-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-3);
}
```

---

## Checklist pre-PR

- [ ] `useDashboardData` o `useAsyncData` — nunca `ref` + `onMounted` + `watch` manualmente
- [ ] Cada fetcher consulta su propia empresa (header `x-company-id`)
- [ ] El `watch: companyId` está conectado para recargar al cambiar de empresa
- [ ] El loading state se pasa a `UiMetricCard` con `:loading="isLoading"`
- [ ] Los errores tienen un `UiErrorState` con `@retry="reload"`

