export const ITEM_TYPES = ['product', 'service'] as const;
export const ITEM_STATUSES = ['active', 'inactive'] as const;

export type ItemType = (typeof ITEM_TYPES)[number];
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export interface ItemCategoryRow {
  id: string;
  company_id: string;
  parent_id: string | null;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CatalogItemRow {
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

export interface PriceListRow {
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

export interface ItemPriceRow {
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

export interface ItemListFilters {
  search?: string;
  categoryId?: string;
  itemType?: ItemType;
  status?: ItemStatus;
  page: number;
  limit: number;
}

export interface CreateItemCategoryInput {
  name: string;
  parentId?: string | null;
}

export interface CreateCatalogItemInput {
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
  isStockable: boolean;
  status?: ItemStatus;
}

export interface UpdateCatalogItemInput extends Partial<CreateCatalogItemInput> {}

export interface CreatePriceListInput {
  code: string;
  name: string;
  currencyCode: string;
  isDefault: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  isActive: boolean;
}

export interface UpdatePriceListInput extends Partial<CreatePriceListInput> {}

export interface CreateItemPriceInput {
  itemId: string;
  price: number;
  minQuantity: number;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface UpdateItemPriceInput extends Partial<Omit<CreateItemPriceInput, 'itemId'>> {}
