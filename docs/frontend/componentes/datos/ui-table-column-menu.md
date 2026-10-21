# UiTableColumnMenu

Menú para **mostrar u ocultar columnas** de una tabla TanStack. La selección se persiste en `localStorage` por tabla, así que sobrevive recargas y navegación.

## Props

| Prop | Tipo | Requerido | Descripción |
|---|---|---|---|
| `table` | Tabla TanStack | ✅ | Instancia de `useTableView` (`table`) |

## Uso

```vue
<UiPageHeader title="Sedes">
  <template #actions>
    <UiTableColumnMenu :table="branchTable" />
  </template>
</UiPageHeader>

<script setup lang="ts">
const { table: branchTable } = useTableView(useBranchColumns(), branchStore, {
  initialSort,
  columnVisibilityKey: 'branches',  // clave de persistencia
})
</script>
```

## Comportamiento

- Solo lista las columnas **ocultables** (`getCanHide()`): las de acción se marcan con `enableHiding: false` en el composable de columnas
- Cada opción usa `role="menuitemcheckbox"` + `aria-checked` y muestra su etiqueta desde `columnDef.meta.label`
- No permite ocultar la **última columna visible** (la opción queda deshabilitada)
- "Mostrar todas" unhidea las columnas ocultas
- El menú se mantiene abierto al hacer clic (los checkboxes no lo cierran)

## Persistencia

`useTableView` es el que guarda el estado, no este componente:

| Llave | Contenido |
|---|---|
| `kaleo:table-columns:{columnVisibilityKey}` | `{ "email": false, "roles": false }` |

Si el estado guardado oculta **todas** las columnas, se ignora y se muestran todas (una tabla sin columnas es un callejón sin salida).

## Accesibilidad

- Navegación con flechas, `Home` y `End` heredada de `UiDropdown` (menú WAI-ARIA)
- `Escape` cierra y devuelve el foco al botón
- Cada opción es un `menuitemcheckbox` con `aria-checked`
