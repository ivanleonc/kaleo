export const UNIT_KINDS = [
  'length',
  'area',
  'volume',
  'mass',
  'quantity',
  'time',
] as const;

export type UnitKind = (typeof UNIT_KINDS)[number];

export interface CurrencyRow {
  code: string;
  name: string;
  symbol: string;
  decimal_digits: number;
  is_active: boolean;
}

export interface UnitRow {
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

export interface UnitConversionRow {
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

export interface TaxRateRow {
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

export interface UnitFilters {
  search?: string;
  kind?: UnitKind;
  includeInactive?: boolean;
}

export interface TaxRateFilters {
  search?: string;
  includeInactive?: boolean;
}
