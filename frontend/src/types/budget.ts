export type BudgetStatus = 'draft' | 'in_review' | 'approved' | 'superseded';
export type BudgetItemType = 'chapter' | 'activity';

export interface Budget {
  id: string;
  company_id: string;
  project_id: string;
  code: string;
  name: string;
  version: number;
  label: string | null;
  status: BudgetStatus;
  currency_code: string;
  apu_base_id: string | null;
  apu_base_name: string | null;
  indirect_pct: number;
  indirect_fixed: number;
  subtotal: number;
  indirect_total: number;
  total: number;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  items_count: number;
}

export interface BudgetItem {
  id: string;
  company_id: string;
  budget_id: string;
  parent_id: string | null;
  code: string;
  name: string;
  item_type: BudgetItemType;
  unit_id: string | null;
  unit_code: string | null;
  unit_name: string | null;
  quantity: number;
  unit_price: number;
  partial_amount: number;
  apu_id: string | null;
  apu_version_id: string | null;
  assigned_membership_id: string | null;
  assigned_user_name: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetDetail extends Budget {
  project_code: string;
  project_name: string;
  items: BudgetItem[];
}

export interface CreateBudgetItemPayload {
  parentId?: string | null;
  code?: string;
  name: string;
  itemType: BudgetItemType;
  unitId?: string | null;
  quantity?: number;
  unitPrice?: number;
  assignedMembershipId?: string | null;
  notes?: string | null;
}

export interface UpdateBudgetItemPayload {
  name?: string;
  quantity?: number;
  unitPrice?: number;
  assignedMembershipId?: string | null;
  notes?: string | null;
  sortOrder?: number;
}

export interface BudgetVersionSummary {
  id: string;
  version: number;
  label: string | null;
  status: BudgetStatus;
  subtotal: number;
  indirect_total: number;
  total: number;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  items_count: number;
}

export type CompareChange = 'added' | 'removed' | 'modified' | 'unchanged';

export interface CompareDiffRow {
  code: string;
  name: string;
  item_type: BudgetItemType;
  base_quantity: number | null;
  base_unit_price: number | null;
  base_partial: number | null;
  target_quantity: number | null;
  target_unit_price: number | null;
  target_partial: number | null;
  delta: number;
  change: CompareChange;
}

export interface CompareResult {
  base: BudgetVersionSummary & { name: string; code: string };
  target: BudgetVersionSummary & { name: string; code: string };
  rows: CompareDiffRow[];
  totals: { base_total: number; target_total: number; delta: number };
}

export interface MaterialRow {
  resource_code: string;
  resource_name: string;
  component_type: string;
  unit_code: string;
  currency_code: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  apu_count: number;
}

export interface BudgetImportSummary {
  budget: BudgetDetail;
  created: number;
  updated: number;
}

export type TakeoffSheetStatus = 'draft' | 'confirmed';

export interface TakeoffSheet {
  id: string;
  company_id: string;
  project_id: string;
  budget_item_id: string | null;
  budget_item_name: string | null;
  name: string;
  description: string | null;
  status: TakeoffSheetStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  lines_count: number;
  total_quantity: number;
}

export interface TakeoffLine {
  id: string;
  company_id: string;
  sheet_id: string;
  description: string;
  unit_id: string;
  unit_code: string;
  unit_name: string;
  parts: number;
  length: number;
  width: number;
  height: number;
  quantity: number;
  notes: string | null;
  created_at: string;
}

export interface TakeoffSheetDetail extends TakeoffSheet {
  lines: TakeoffLine[];
}

export interface CreateTakeoffSheetPayload {
  name: string;
  description?: string | null;
  budgetItemId?: string | null;
}

export interface CreateTakeoffLinePayload {
  description: string;
  unitId: string;
  parts?: number;
  length?: number;
  width?: number;
  height?: number;
  quantity?: number;
  notes?: string | null;
}
