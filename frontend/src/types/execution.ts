export type ScheduleStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';
export type ContractType = 'obra' | 'subcontrato' | 'servicio' | 'suministro' | 'otro';
export type ContractStatus = 'draft' | 'active' | 'completed' | 'terminated';
export type PayrollStatus = 'draft' | 'paid' | 'cancelled';
export type MovementType = 'in' | 'out' | 'adjustment';
export type PurchaseOrderStatus = 'draft' | 'sent' | 'received' | 'cancelled';

export interface ScheduleActivity {
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

export interface Contract {
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

export interface PayrollEntry {
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

export interface Warehouse {
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

export interface StockMovement {
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

export interface PurchaseOrder {
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

export interface PurchaseOrderLine {
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

export interface PurchaseOrderDetail extends PurchaseOrder {
  lines: PurchaseOrderLine[];
}

export interface PurchaseOrderLinePayload {
  resourceId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
}
