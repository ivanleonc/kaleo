# Guías de Desarrollo

Bienvenido a las guías de desarrollo de Kaleo. Aquí encontrarás instrucciones paso a paso para crear cualquier tipo de módulo, manteniendo el mismo estándar de calidad del proyecto.

## ¿Qué tipo de módulo vas a crear?

```
¿El módulo muestra una lista con crear/editar/eliminar?
    → CRUD tabular → docs/guias/nuevo-crud

¿El módulo muestra datos sin modificarlos, con exportación?
    → Reporte → docs/guias/nuevo-reporte

¿El módulo muestra métricas o gráficas?
    → Dashboard → docs/guias/nuevo-dashboard

¿El módulo muestra el detalle de un único registro?
    → Vista de detalle → docs/guias/nueva-vista-detalle

¿El módulo necesita datos de otros módulos existentes?
    → Módulos relacionados → docs/guias/modulos-relacionados
```

## Resumen de los 5 patrones

| Patrón | Ejemplo | Stack frontend |
|---|---|---|
| **CRUD tabular** | Miembros, Sedes | `usePaginatedSetup` + `useTableView` + `useModal` |
| **Reporte** | Auditoría | `usePaginatedSetup` o cursor + `UiExportButton` |
| **Dashboard** | Dashboard principal | `useDashboardData` + `UiMetricCard` |
| **Vista de detalle** | Detalle de factura | `useAsyncData` + `UiDetailGrid` + `UiInfoRow` |
| **Módulo relacionado** | Facturas con clientes | `useAsyncData` para datos de referencia sin tocar el store foráneo |

## Antes de crear un módulo nuevo

1. Lee la guía correspondiente completa
2. Verifica que el tipo de módulo no existe ya (evita duplicación)
3. Agrega los permisos en `packages/shared/permissions.ts` PRIMERO — así tanto el backend como el frontend usan los mismos códigos desde el inicio
4. Aplica la migración SQL en `kaleo-dev` antes de escribir código

## Checklist final

Antes de abrir el PR, revisa el [Checklist pre-PR](/guias/checklist).
