import { createAppColumnHelper, type AppColumnDef } from '@/composables/useAppTable';
import type {
  BudgetTreeRow,
  BudgetVersionSummary,
  CompareDiffRow,
  MaterialRow,
  TakeoffLine,
} from '@/types/budget';

const itemHelper = createAppColumnHelper<BudgetTreeRow>();
const materialHelper = createAppColumnHelper<MaterialRow>();
const versionHelper = createAppColumnHelper<BudgetVersionSummary>();
const compareHelper = createAppColumnHelper<CompareDiffRow>();
const takeoffHelper = createAppColumnHelper<TakeoffLine>();

/** Columnas del presupuesto. Sin orden: la jerarquía la define el WBS. */
export function useBudgetItemColumns(): AppColumnDef<BudgetTreeRow>[] {
  return [
    itemHelper.accessor('code', {
      header: 'Código',
      meta: { label: 'Código' },
      enableSorting: false,
      enableHiding: false,
    }),
    itemHelper.accessor('name', {
      header: 'Actividad',
      meta: { label: 'Actividad' },
      enableSorting: false,
      enableHiding: false,
    }),
    itemHelper.accessor('unit_code', {
      header: 'Unidad',
      meta: { label: 'Unidad', align: 'center' },
      enableSorting: false,
    }),
    itemHelper.accessor('quantity', {
      header: 'Cantidad',
      meta: { label: 'Cantidad', align: 'right' },
      enableSorting: false,
    }),
    itemHelper.accessor('unit_price', {
      header: 'Valor unitario',
      meta: { label: 'Valor unitario', align: 'right' },
      enableSorting: false,
    }),
    itemHelper.accessor('partial_amount', {
      header: 'Valor parcial',
      meta: { label: 'Valor parcial', align: 'right' },
      enableSorting: false,
    }),
    itemHelper.accessor((row) => row.assigned_user_name || '', {
      id: 'assigned_user_name',
      header: 'Responsable',
      meta: { label: 'Responsable' },
      enableSorting: false,
    }),
    itemHelper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Acciones', align: 'right' },
      enableHiding: false,
      enableSorting: false,
    }),
  ];
}

/** Columnas del listado consolidado de insumos. */
export function useMaterialColumns(): AppColumnDef<MaterialRow>[] {
  return [
    materialHelper.accessor('resource_code', {
      header: 'Código',
      meta: { label: 'Código' },
    }),
    materialHelper.accessor('resource_name', {
      header: 'Insumo',
      meta: { label: 'Insumo' },
    }),
    materialHelper.accessor('component_type', {
      header: 'Tipo',
      meta: { label: 'Tipo' },
    }),
    materialHelper.accessor('unit_code', {
      header: 'Unidad',
      meta: { label: 'Unidad', align: 'center' },
    }),
    materialHelper.accessor('quantity', {
      header: 'Cantidad',
      meta: { label: 'Cantidad', align: 'right' },
    }),
    materialHelper.accessor('unit_cost', {
      header: 'Costo unitario',
      meta: { label: 'Costo unitario', align: 'right' },
    }),
    materialHelper.accessor('total_cost', {
      header: 'Costo total',
      meta: { label: 'Costo total', align: 'right' },
    }),
    materialHelper.accessor('apu_count', {
      header: 'APUs',
      meta: { label: 'APUs', align: 'center' },
    }),
  ];
}

/** Columnas del historial de versiones. */
export function useVersionColumns(): AppColumnDef<BudgetVersionSummary>[] {
  return [
    versionHelper.accessor('version', {
      header: 'Versión',
      meta: { label: 'Versión' },
    }),
    versionHelper.accessor((version) => version.label || '—', {
      id: 'label',
      header: 'Etiqueta',
      meta: { label: 'Etiqueta' },
    }),
    versionHelper.accessor('status', {
      header: 'Estado',
      meta: { label: 'Estado', align: 'center' },
    }),
    versionHelper.accessor('subtotal', {
      header: 'Directo',
      meta: { label: 'Directo', align: 'right' },
    }),
    versionHelper.accessor('total', {
      header: 'Total',
      meta: { label: 'Total', align: 'right' },
    }),
    versionHelper.accessor('items_count', {
      header: 'Ítems',
      meta: { label: 'Ítems', align: 'center' },
    }),
    versionHelper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Acciones', align: 'right' },
      enableHiding: false,
      enableSorting: false,
    }),
  ];
}

/** Columnas del comparador de versiones. */
export function useCompareColumns(): AppColumnDef<CompareDiffRow>[] {
  return [
    compareHelper.accessor('code', { header: 'Código', meta: { label: 'Código' } }),
    compareHelper.accessor('name', { header: 'Actividad', meta: { label: 'Actividad' } }),
    compareHelper.accessor((row) => row.base_quantity ?? '', {
      id: 'base_quantity',
      header: 'Cantidad base',
      meta: { label: 'Cantidad base', align: 'right' },
    }),
    compareHelper.accessor((row) => row.target_quantity ?? '', {
      id: 'target_quantity',
      header: 'Cantidad nueva',
      meta: { label: 'Cantidad nueva', align: 'right' },
    }),
    compareHelper.accessor((row) => row.base_partial ?? '', {
      id: 'base_partial',
      header: 'Valor base',
      meta: { label: 'Valor base', align: 'right' },
    }),
    compareHelper.accessor((row) => row.target_partial ?? '', {
      id: 'target_partial',
      header: 'Valor nuevo',
      meta: { label: 'Valor nuevo', align: 'right' },
    }),
    compareHelper.accessor('delta', {
      header: 'Diferencia',
      meta: { label: 'Diferencia', align: 'right' },
    }),
    compareHelper.accessor('change', {
      header: 'Cambio',
      meta: { label: 'Cambio', align: 'center' },
    }),
  ];
}

/** Columnas de las líneas de una hoja de takeoff. */
export function useTakeoffLineColumns(): AppColumnDef<TakeoffLine>[] {
  return [
    takeoffHelper.accessor('description', {
      header: 'Descripción',
      meta: { label: 'Descripción' },
    }),
    takeoffHelper.accessor('unit_code', {
      header: 'Unidad',
      meta: { label: 'Unidad', align: 'center' },
    }),
    takeoffHelper.accessor(
      (line) =>
        [line.parts, line.length, line.width, line.height]
          .filter((value) => value > 0)
          .join(' × '),
      { id: 'dimensions', header: 'Medidas', meta: { label: 'Medidas' } },
    ),
    takeoffHelper.accessor('quantity', {
      header: 'Cantidad',
      meta: { label: 'Cantidad', align: 'right' },
    }),
    takeoffHelper.accessor((line) => line.notes || '—', {
      id: 'notes',
      header: 'Notas',
      meta: { label: 'Notas' },
    }),
    takeoffHelper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Acciones', align: 'right' },
      enableHiding: false,
      enableSorting: false,
    }),
  ];
}
