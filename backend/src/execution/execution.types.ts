export const SCHEDULE_STATUSES = ['pending', 'in_progress', 'completed', 'delayed'] as const;
export const CONTRACT_TYPES = ['obra', 'subcontrato', 'servicio', 'suministro', 'otro'] as const;
export const CONTRACT_STATUSES = ['draft', 'active', 'completed', 'terminated'] as const;
export const PAYROLL_STATUSES = ['draft', 'paid', 'cancelled'] as const;
export const MOVEMENT_TYPES = ['in', 'out', 'adjustment'] as const;
export const PURCHASE_ORDER_STATUSES = ['draft', 'sent', 'received', 'cancelled'] as const;

export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];
export type ContractType = (typeof CONTRACT_TYPES)[number];
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];
export type PayrollStatus = (typeof PAYROLL_STATUSES)[number];
export type MovementType = (typeof MOVEMENT_TYPES)[number];
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export interface ScheduleActivityRow {
  id: string;
  company_id: string;
  project_id: string;
  budget_item_id: string | null;
  name: string;
  start_date: string | null;
  end_date: string | null;
  progress_pct: number;
  predecessor_id: string | null;
  status: ScheduleStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ContractRow {
  id: string;
  company_id: string;
  project_id: string;
  party_id: string | null;
  party_name: string | null;
  contract_type: ContractType;
  code: string;
  name: string;
  amount: number;
  currency_code: string;
  start_date: string | null;
  end_date: string | null;
  status: ContractStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PayrollEntryRow {
  id: string;
  company_id: string;
  project_id: string;
  membership_id: string | null;
  worker_name: string;
  period_start: string;
  period_end: string;
  days: number;
  amount: number;
  currency_code: string;
  status: PayrollStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WarehouseRow {
  id: string;
  company_id: string;
  project_id: string | null;
  project_name: string | null;
  code: string;
  name: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StockMovementRow {
  id: string;
  company_id: string;
  warehouse_id: string;
  resource_id: string;
  resource_code: string;
  resource_name: string;
  unit_code: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost: number;
  occurred_at: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface PurchaseOrderRow {
  id: string;
  company_id: string;
  project_id: string;
  supplier_party_id: string | null;
  supplier_name: string | null;
  code: string;
  status: PurchaseOrderStatus;
  currency_code: string;
  notes: string | null;
  lines_count: number;
  total: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PurchaseOrderLineRow {
  id: string;
  company_id: string;
  purchase_order_id: string;
  resource_id: string | null;
  resource_code: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface PurchaseOrderDetail extends PurchaseOrderRow {
  lines: PurchaseOrderLineRow[];
}

export interface CreatePurchaseOrderInput {
  supplierPartyId?: string | null;
  code: string;
  currencyCode: string;
  status?: PurchaseOrderStatus;
  notes?: string | null;
  lines: Array<{
    resourceId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}
