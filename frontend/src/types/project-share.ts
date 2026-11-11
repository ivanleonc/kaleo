export type ShareScope = 'summary' | 'budget';

export interface ShareLink {
  id: string;
  company_id: string;
  project_id: string;
  label: string | null;
  scope: ShareScope;
  expires_at: string | null;
  revoked_at: string | null;
  views_count: number;
  created_by: string | null;
  creator_name: string | null;
  created_at: string;
  /** Solo se devuelve al crear el enlace. */
  token?: string;
}

export interface SharedBudgetItem {
  code: string;
  name: string;
  item_type: string;
  unit_code: string | null;
  quantity: number;
  unit_price: number;
  partial_amount: number;
}

export interface SharedProjectPayload {
  company_name: string;
  project: {
    code: string;
    name: string;
    description: string | null;
    status: string;
    category: string | null;
    client_name: string | null;
    start_date: string | null;
    end_date: string | null;
  };
  budget: {
    name: string;
    version: number;
    label: string | null;
    status: string;
    currency_code: string;
    subtotal: number;
    indirect_pct: number;
    indirect_fixed: number;
    indirect_total: number;
    total: number;
    approved_at: string | null;
    items?: SharedBudgetItem[];
  } | null;
}
