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

export type ItemType = 'product' | 'service';
export type ItemStatus = 'active' | 'inactive';

export interface ItemCategory {
  id: string;
  company_id: string;
  parent_id: string | null;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CatalogItem {
  id: string;
  company_id: string;
  sku: string;
  name: string;
  description: string | null;
  item_type: ItemType;
  category_id: string | null;
  category_name: string | null;
  unit_id: string;
  unit_code: string;
  unit_name: string;
  tax_rate_id: string | null;
  tax_name: string | null;
  tax_rate: number | null;
  cost: number;
  price: number;
  currency_code: string;
  is_stockable: boolean;
  status: ItemStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PriceList {
  id: string;
  company_id: string;
  code: string;
  name: string;
  currency_code: string;
  is_default: boolean;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  prices_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ItemPrice {
  id: string;
  company_id: string;
  price_list_id: string;
  item_id: string;
  item_sku: string;
  item_name: string;
  price: number;
  min_quantity: number;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateItemCategoryPayload {
  name: string;
  parentId?: string | null;
}

export interface CreateCatalogItemPayload {
  sku: string;
  name: string;
  description?: string | null;
  itemType: ItemType;
  categoryId?: string | null;
  unitId: string;
  taxRateId?: string | null;
  cost: number;
  price: number;
  currencyCode: string;
  isStockable?: boolean;
  status?: ItemStatus;
}

export interface CreatePriceListPayload {
  code: string;
  name: string;
  currencyCode: string;
  isDefault?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
}

export interface CreateItemPricePayload {
  itemId: string;
  price: number;
  minQuantity?: number;
  validFrom?: string | null;
  validTo?: string | null;
}
