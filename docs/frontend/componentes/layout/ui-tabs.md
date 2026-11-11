# UiTabs

Navegación por pestañas accesible (`tablist` / `tab` / `tabpanel`) con dos variantes visuales: subrayada y píldora. Sustituye las implementaciones duplicadas de las vistas.

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `tabs` | `UiTabItem[]` | Requerido | Pestañas: `{ value, label, icon?, count? }` |
| `groupLabel` | `string` | Requerido | Etiqueta accesible del `tablist` |
| `variant` | `'underline' \| 'pills'` | `'underline'` | Estilo visual |
| `scrollable` | `boolean` | `false` | Scroll horizontal en pantallas estrechas |
| `panelIdPrefix` | `string` | `'ui-tabs'` | Prefijo para generar ids de tab/panel |

## Model

`v-model: string` — valor de la pestaña activa.

## Accesibilidad

- `role="tablist"`, `role="tab"`, `aria-selected`, `tabindex` móvil (solo el activo es tabulable).
- `aria-controls` apunta a `{panelIdPrefix}-panel-{value}`.
- Teclado: `←`/`→` mueven entre pestañas, `Home`/`End` van a la primera/última.

El panel correspondiente debe declararse en la vista:

```vue
<UiTabs
  v-model="activeTab"
  :tabs="tabs"
  group-label="Secciones del presupuesto"
  panel-id-prefix="budget"
/>

<div
  id="budget-panel-total"
  role="tabpanel"
  aria-labelledby="budget-tab-total"
>
  ...
</div>
```

## Ejemplo con contadores

```vue
<UiTabs
  v-model="activeTab"
  :tabs="[
    { value: 'budget', label: 'Presupuesto', icon: IconTable },
    { value: 'materials', label: 'Insumos', icon: IconStack2, count: materials.length },
  ]"
  group-label="Secciones del presupuesto"
/>
```
