import { createAppColumnHelper, type AppColumnDef } from '@/composables/useAppTable';
import type { Apu, ApuBase, Resource } from '@/types/estimating';

const resourceHelper = createAppColumnHelper<Resource>();
const baseHelper = createAppColumnHelper<ApuBase>();
const apuHelper = createAppColumnHelper<Apu>();

/** Columnas del catálogo de recursos de estimación. */
export function useResourceColumns(): AppColumnDef<Resource>[] {
  return [
    resourceHelper.accessor('resource_type', {
      header: 'Tipo',
      meta: { label: 'Tipo' },
    }),
    resourceHelper.accessor('code', { header: 'Código', meta: { label: 'Código' } }),
    resourceHelper.accessor('name', { header: 'Nombre', meta: { label: 'Nombre' } }),
    resourceHelper.accessor('unit_code', {
      header: 'Unidad',
      meta: { label: 'Unidad', align: 'center' },
    }),
    resourceHelper.accessor('base_cost', {
      header: 'Costo base',
      meta: { label: 'Costo base', align: 'right' },
    }),
    resourceHelper.accessor('is_active', {
      id: 'status',
      header: 'Estado',
      meta: { label: 'Estado', align: 'center' },
    }),
    resourceHelper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Acciones', align: 'right' },
      enableHiding: false,
      enableSorting: false,
    }),
  ];
}

/** Columnas de las bases de APUs. */
export function useApuBaseColumns(): AppColumnDef<ApuBase>[] {
  return [
    baseHelper.accessor('code', { header: 'Código', meta: { label: 'Código' } }),
    baseHelper.accessor('name', { header: 'Nombre', meta: { label: 'Nombre' } }),
    baseHelper.accessor((base) => base.source || '', {
      id: 'source',
      header: 'Fuente',
      meta: { label: 'Fuente' },
    }),
    baseHelper.accessor('apus_count', {
      header: 'APUs',
      meta: { label: 'APUs', align: 'center' },
    }),
    baseHelper.accessor('is_active', {
      id: 'status',
      header: 'Estado',
      meta: { label: 'Estado', align: 'center' },
    }),
    baseHelper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Acciones', align: 'right' },
      enableHiding: false,
      enableSorting: false,
    }),
  ];
}

/** Columnas del listado de APUs. */
export function useApuColumns(): AppColumnDef<Apu>[] {
  return [
    apuHelper.accessor('code', { header: 'Código', meta: { label: 'Código' } }),
    apuHelper.accessor('name', { header: 'Actividad', meta: { label: 'Actividad' } }),
    apuHelper.accessor('base_name', { header: 'Base', meta: { label: 'Base' } }),
    apuHelper.accessor('unit_code', {
      header: 'Unidad',
      meta: { label: 'Unidad', align: 'center' },
    }),
    apuHelper.accessor('lines_count', {
      header: 'Insumos',
      meta: { label: 'Insumos', align: 'center' },
    }),
    apuHelper.accessor('unit_cost', {
      header: 'Costo unitario',
      meta: { label: 'Costo unitario', align: 'right' },
    }),
    apuHelper.accessor('current_version_status', {
      id: 'status',
      header: 'Estado',
      meta: { label: 'Estado', align: 'center' },
    }),
    apuHelper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Acciones', align: 'right' },
      enableHiding: false,
      enableSorting: false,
    }),
  ];
}
