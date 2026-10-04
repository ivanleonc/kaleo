# UiChart

Wrapper de ECharts para graficas (barras, lineas, donas, etc.).

## Props

| Prop | Tipo | Default | Descripcion |
|---|---|---|---|
| `option` | `EChartsOption` | Requerido | Opciones de ECharts |
| `height` | string | `'300px'` | Alto del contenedor |
| `loading` | boolean | `false` | Estado de carga |

## Ejemplo

```vue
<script setup>
const barOptions = computed(() => ({
  xAxis: { data: monthLabels.value },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: amounts.value }]
}))
</script>

<UiChart :option="barOptions" height="400px" :loading="isLoading" />
```n
## Notas

- Requiere `vue-echarts` y `echarts` (ya instalados)
- Reactivo: se actualiza automaticamente cuando `option` cambia
- Responsive: se redimensiona con el contenedor
