export type UnitKind = 'length' | 'area' | 'volume' | 'mass' | 'quantity' | 'time';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimal_digits: number;
  is_active: boolean;
}

export interface Unit {
  id: string;
  company_id: string | null;
  code: string;
  name: string;
  kind: UnitKind;
  precision: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_global: boolean;
  conversions_count: number;
}

export interface UnitConversion {
  id: string;
  company_id: string | null;
  from_unit_id: string;
  to_unit_id: string;
  factor: number;
  from_code: string;
  from_name: string;
  to_code: string;
  to_name: string;
  created_at: string;
}

export interface TaxRate {
  id: string;
  company_id: string;
  code: string;
  name: string;
  rate: number;
  country_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateUnitPayload {
  code: string;
  name: string;
  kind: UnitKind;
  precision?: number;
  isActive?: boolean;
}

export interface CreateTaxRatePayload {
  code: string;
  name: string;
  rate: number;
  countryCode?: string;
  isActive?: boolean;
}
