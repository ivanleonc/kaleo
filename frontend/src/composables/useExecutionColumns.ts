import { createAppColumnHelper, type AppColumnDef } from '@/composables/useAppTable';
import type {
  Contract,
  PayrollEntry,
  PurchaseOrder,
  PurchaseOrderLine,
  ScheduleActivity,
  StockMovement,
  Warehouse,
} from '@/types/execution';

const scheduleHelper = createAppColumnHelper<ScheduleActivity>();
const contractHelper = createAppColumnHelper<Contract>();
const payrollHelper = createAppColumnHelper<PayrollEntry>();
const warehouseHelper = createAppColumnHelper<Warehouse>();
const movementHelper = createAppColumnHelper<StockMovement>();
const purchaseHelper = createAppColumnHelper<PurchaseOrder>();
const purchaseLineHelper = createAppColumnHelper<PurchaseOrderLine>();

export function useScheduleColumns(): AppColumnDef<ScheduleActivity>[] {
  return [
    scheduleHelper.accessor('name', { header: 'Actividad', meta: { label: 'Actividad' } }),
    scheduleHelper.accessor('start_date', {
      header: 'Inicio',
      meta: { label: 'Inicio' },
      sortFn: 'datetime',
    }),
    scheduleHelper.accessor('end_date', {
      header: 'Fin',
      meta: { label: 'Fin' },
      sortFn: 'datetime',
    }),
    scheduleHelper.accessor('progress_pct', {
      header: 'Avance',
      meta: { label: 'Avance', align: 'center' },
    }),
    scheduleHelper.accessor('status', {
      header: 'Estado',
      meta: { label: 'Estado', align: 'center' },
    }),
    scheduleHelper.accessor((row) => row.notes || '', {
      id: 'notes',
      header: 'Notas',
      meta: { label: 'Notas' },
    }),
    scheduleHelper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Acciones', align: 'right' },
      enableHiding: false,
      enableSorting: false,
    }),
  ];
}

export function useContractColumns(): AppColumnDef<Contract>[] {
  return [
    contractHelper.accessor('code', { header: 'Código', meta: { label: 'Código' } }),
    contractHelper.accessor('name', { header: 'Contrato', meta: { label: 'Contrato' } }),
    contractHelper.accessor((row) => row.party_name || '—', {
      id: 'party_name',
      header: 'Tercero',
      meta: { label: 'Tercero' },
    }),
    contractHelper.accessor('contract_type', {
      header: 'Tipo',
      meta: { label: 'Tipo' },
    }),
    contractHelper.accessor('amount', {
      header: 'Valor',
      meta: { label: 'Valor', align: 'right' },
    }),
    contractHelper.accessor('start_date', {
      header: 'Inicio',
      meta: { label: 'Inicio' },
      sortFn: 'datetime',
    }),
    contractHelper.accessor('end_date', {
      header: 'Fin',
      meta: { label: 'Fin' },
      sortFn: 'datetime',
    }),
    contractHelper.accessor('status', {
      header: 'Estado',
      meta: { label: 'Estado', align: 'center' },
    }),
    contractHelper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Acciones', align: 'right' },
      enableHiding: false,
      enableSorting: false,
    }),
  ];
}

export function usePayrollColumns(): AppColumnDef<PayrollEntry>[] {
  return [
    payrollHelper.accessor('worker_name', {
      header: 'Trabajador',
      meta: { label: 'Trabajador' },
    }),
    payrollHelper.accessor('period_start', {
      header: 'Desde',
      meta: { label: 'Desde' },
      sortFn: 'datetime',
    }),
    payrollHelper.accessor('period_end', {
      header: 'Hasta',
      meta: { label: 'Hasta' },
      sortFn: 'datetime',
    }),
    payrollHelper.accessor('days', {
      header: 'Días',
      meta: { label: 'Días', align: 'right' },
    }),
    payrollHelper.accessor('amount', {
      header: 'Valor',
      meta: { label: 'Valor', align: 'right' },
    }),
    payrollHelper.accessor('status', {
      header: 'Estado',
      meta: { label: 'Estado', align: 'center' },
    }),
    payrollHelper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Acciones', align: 'right' },
      enableHiding: false,
      enableSorting: false,
    }),
  ];
}

export function useWarehouseColumns(): AppColumnDef<Warehouse>[] {
  return [
    warehouseHelper.accessor('code', { header: 'Código', meta: { label: 'Código' } }),
    warehouseHelper.accessor('name', { header: 'Almacén', meta: { label: 'Almacén' } }),
    warehouseHelper.accessor((row) => row.location || '—', {
      id: 'location',
      header: 'Ubicación',
      meta: { label: 'Ubicación' },
    }),
    warehouseHelper.accessor('is_active', {
      id: 'status',
      header: 'Estado',
      meta: { label: 'Estado', align: 'center' },
    }),
    warehouseHelper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Acciones', align: 'right' },
      enableHiding: false,
      enableSorting: false,
    }),
  ];
}

export function useMovementColumns(): AppColumnDef<StockMovement>[] {
  return [
    movementHelper.accessor('occurred_at', {
      header: 'Fecha',
      meta: { label: 'Fecha' },
      sortFn: 'datetime',
    }),
    movementHelper.accessor('resource_code', {
      header: 'Código',
      meta: { label: 'Código' },
    }),
    movementHelper.accessor('resource_name', {
      header: 'Insumo',
      meta: { label: 'Insumo' },
    }),
    movementHelper.accessor('movement_type', {
      header: 'Tipo',
      meta: { label: 'Tipo' },
    }),
    movementHelper.accessor('quantity', {
      header: 'Cantidad',
      meta: { label: 'Cantidad', align: 'right' },
    }),
    movementHelper.accessor('unit_cost', {
      header: 'Costo unitario',
      meta: { label: 'Costo unitario', align: 'right' },
    }),
    movementHelper.accessor((row) => row.reference || '—', {
      id: 'reference',
      header: 'Referencia',
      meta: { label: 'Referencia' },
    }),
    movementHelper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Acciones', align: 'right' },
      enableHiding: false,
      enableSorting: false,
    }),
  ];
}

export function usePurchaseColumns(): AppColumnDef<PurchaseOrder>[] {
  return [
    purchaseHelper.accessor('code', { header: 'Código', meta: { label: 'Código' } }),
    purchaseHelper.accessor((row) => row.supplier_name || '—', {
      id: 'supplier_name',
      header: 'Proveedor',
      meta: { label: 'Proveedor' },
    }),
    purchaseHelper.accessor('lines_count', {
      header: 'Líneas',
      meta: { label: 'Líneas', align: 'center' },
    }),
    purchaseHelper.accessor('total', {
      header: 'Total',
      meta: { label: 'Total', align: 'right' },
    }),
    purchaseHelper.accessor('status', {
      header: 'Estado',
      meta: { label: 'Estado', align: 'center' },
    }),
    purchaseHelper.accessor('created_at', {
      header: 'Creada',
      meta: { label: 'Creada' },
      sortFn: 'datetime',
    }),
    purchaseHelper.display({
      id: 'actions',
      header: '',
      meta: { label: 'Acciones', align: 'right' },
      enableHiding: false,
      enableSorting: false,
    }),
  ];
}

export function usePurchaseLineColumns(): AppColumnDef<PurchaseOrderLine>[] {
  return [
    purchaseLineHelper.accessor((row) => row.resource_code || '—', {
      id: 'resource_code',
      header: 'Código',
      meta: { label: 'Código' },
    }),
    purchaseLineHelper.accessor('description', {
      header: 'Descripción',
      meta: { label: 'Descripción' },
    }),
    purchaseLineHelper.accessor('quantity', {
      header: 'Cantidad',
      meta: { label: 'Cantidad', align: 'right' },
    }),
    purchaseLineHelper.accessor('unit_price', {
      header: 'Valor unitario',
      meta: { label: 'Valor unitario', align: 'right' },
    }),
    purchaseLineHelper.accessor('amount', {
      header: 'Valor',
      meta: { label: 'Valor', align: 'right' },
    }),
  ];
}
