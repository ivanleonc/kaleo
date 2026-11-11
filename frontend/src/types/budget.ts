export type BudgetStatus = 'draft' | 'in_review' | 'approved' | 'superseded';
export type BudgetItemType = 'chapter' | 'activity';

export interface Budget {
  id: string;
  company_id: string;
  project_id: string;
  code: string;
  name: string;
  version: number;
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
