export type ResourceType = 'material' | 'labor' | 'equipment' | 'transport' | 'subcontract';
export type ApuStatus = 'draft' | 'active' | 'archived';
export type ApuVersionStatus = 'draft' | 'approved' | 'superseded';

export interface Resource {
  id: string;
  company_id: string;
  resource_type: ResourceType;
  code: string;
  name: string;
  description: string | null;
  unit_id: string;
  unit_code: string;
  unit_name: string;
  base_cost: number;
  currency_code: string;
  catalog_item_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ResourcePrice {
  id: string;
  company_id: string;
  resource_id: string;
  supplier_party_id: string | null;
  supplier_name: string | null;
  price: number;
  currency_code: string;
  valid_from: string | null;
  valid_to: string | null;
  source: string | null;
  created_at: string;
}

export interface ApuBase {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  source: string | null;
  is_active: boolean;
  apus_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Apu {
  id: string;
  company_id: string;
  base_id: string;
  base_name: string;
  code: string;
  name: string;
  description: string | null;
  unit_id: string;
  unit_code: string;
  unit_name: string;
  status: ApuStatus;
  current_version_id: string | null;
  current_version_number: number | null;
  current_version_status: ApuVersionStatus | null;
  unit_cost: number;
  lines_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ApuVersion {
  id: string;
  company_id: string;
  apu_id: string;
  version_number: number;
  status: ApuVersionStatus;
  output_quantity: number;
  performance: number | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface ApuLine {
  id: string;
  company_id: string;
  apu_version_id: string;
  resource_id: string;
  resource_code: string;
  resource_name: string;
  component_type: ResourceType;
  unit_code: string;
  quantity: number;
  waste_pct: number;
  performance: number;
  unit_cost_snapshot: number;
  currency_code: string;
  sort_order: number;
  notes: string | null;
  partial_amount: number;
}

export interface ApuDetail extends Apu {
  versions: ApuVersion[];
  lines: ApuLine[];
}

export interface CreateResourcePayload {
  resourceType: ResourceType;
  code: string;
  name: string;
  description?: string | null;
  unitId: string;
  baseCost: number;
  currencyCode: string;
  catalogItemId?: string | null;
  isActive?: boolean;
}

export interface CreateApuBasePayload {
  code: string;
  name: string;
  description?: string | null;
  source?: string | null;
  isActive?: boolean;
}

export interface CreateApuPayload {
  baseId: string;
  code: string;
  name: string;
  description?: string | null;
  unitId: string;
  status?: ApuStatus;
}

export interface CreateApuLinePayload {
  resourceId: string;
  quantity: number;
  wastePct?: number;
  performance?: number;
  notes?: string | null;
}
