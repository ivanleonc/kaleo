import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { withTenantTransaction } from '../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import { buildDynamicUpdate } from '../common/utils/sql.helper.js';
import type {
  CatalogItemRow,
  CreateCatalogItemInput,
  CreateItemCategoryInput,
  CreateItemPriceInput,
  CreatePriceListInput,
  ItemCategoryRow,
  ItemListFilters,
  ItemPriceRow,
  PriceListRow,
  UpdateItemPriceInput,
} from './items.types.js';

@Injectable()
export class CatalogItemsRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  // ─── Categorías ───────────────────────────────────────────────────────────
  async listCategories(companyId: string): Promise<ItemCategoryRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      return (await queryRunner.query(
        `SELECT * FROM item_categories
         WHERE company_id = $1 AND deleted_at IS NULL
         ORDER BY path, name`,
        [companyId],
      )) as ItemCategoryRow[];
    });
  }

  async findCategoryById(companyId: string, id: string): Promise<ItemCategoryRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT * FROM item_categories
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [id, companyId],
      )) as ItemCategoryRow[];
      return rows[0] ?? null;
    });
  }

  async createCategory(
    companyId: string,
    id: string,
    input: CreateItemCategoryInput,
    path: string,
  ): Promise<ItemCategoryRow> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO item_categories (id, company_id, parent_id, name, path)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, companyId, input.parentId ?? null, input.name, path],
      )) as ItemCategoryRow[];
      return rows[0]!;
    });
  }

  async updateCategory(
    companyId: string,
    id: string,
    input: { name?: string; parentId?: string | null; path?: string },
  ): Promise<ItemCategoryRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(
        { name: input.name, parent_id: input.parentId, path: input.path },
        ['name', 'parent_id', 'path'],
        { extraSet: ['updated_at = now()'] },
      );
      values.push(id, companyId);
      const rows = (await queryRunner.query(
        `UPDATE item_categories
         SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL
         RETURNING *`,
        values,
      )) as ItemCategoryRow[];
      return rows[0] ?? null;
    });
  }

  async deleteCategory(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE item_categories
         SET deleted_at = now()
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async updateDescendantPaths(
    companyId: string,
    oldPath: string,
    newPath: string,
  ): Promise<void> {
    this.assertCompany(companyId);
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      await queryRunner.query(
        `UPDATE item_categories
         SET path = $3 || substring(path from length($2) + 1)
         WHERE company_id = $1 AND path LIKE $2 || '/%'`,
        [companyId, oldPath, newPath],
      );
    });
  }

  async countCategoryChildren(companyId: string, id: string): Promise<number> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT COUNT(*)::int AS count FROM item_categories
         WHERE company_id = $1 AND parent_id = $2 AND deleted_at IS NULL`,
        [companyId, id],
      )) as Array<{ count: number }>;
      return rows[0]?.count ?? 0;
    });
  }

  async countCategoryItems(companyId: string, id: string): Promise<number> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT COUNT(*)::int AS count FROM catalog_items
         WHERE company_id = $1 AND category_id = $2 AND deleted_at IS NULL`,
        [companyId, id],
      )) as Array<{ count: number }>;
      return rows[0]?.count ?? 0;
    });
  }

  // ─── Ítems ────────────────────────────────────────────────────────────────
  async listItems(
    companyId: string,
    filters: ItemListFilters,
  ): Promise<{ data: CatalogItemRow[]; total: number }> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const values: unknown[] = [companyId];
      const where = ['i.company_id = $1', 'i.deleted_at IS NULL'];
      if (filters.search) {
        values.push(`%${filters.search}%`);
        where.push(
          `(i.sku ILIKE $${values.length} OR i.name ILIKE $${values.length}
            OR COALESCE(i.description, '') ILIKE $${values.length})`,
        );
      }
      if (filters.categoryId) {
        values.push(filters.categoryId);
        where.push(`i.category_id = $${values.length}`);
      }
      if (filters.itemType) {
        values.push(filters.itemType);
        where.push(`i.item_type = $${values.length}`);
      }
      if (filters.status) {
        values.push(filters.status);
        where.push(`i.status = $${values.length}`);
      }
      const whereSql = where.join(' AND ');
      const count = (await queryRunner.query(
        `SELECT COUNT(*)::int AS total FROM catalog_items i WHERE ${whereSql}`,
        values,
      )) as Array<{ total: number }>;

      const page = Math.max(filters.page, 1);
      const limit = Math.min(Math.max(filters.limit, 1), 100);
      values.push(limit, (page - 1) * limit);
      const rows = (await queryRunner.query(
        `SELECT i.*, c.name AS category_name,
                u.code AS unit_code, u.name AS unit_name,
                t.name AS tax_name, t.rate::float8 AS tax_rate
         FROM catalog_items i
         LEFT JOIN item_categories c
           ON c.id = i.category_id AND c.company_id = i.company_id
         JOIN units_of_measure u ON u.id = i.unit_id
         LEFT JOIN tax_rates t
           ON t.id = i.tax_rate_id AND t.company_id = i.company_id
         WHERE ${whereSql}
         ORDER BY i.name, i.sku
         LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      )) as CatalogItemRow[];
      return { data: rows.map(mapItem), total: count[0]?.total ?? 0 };
    });
  }

  async findItemById(companyId: string, id: string): Promise<CatalogItemRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT i.*, c.name AS category_name,
                u.code AS unit_code, u.name AS unit_name,
                t.name AS tax_name, t.rate::float8 AS tax_rate
         FROM catalog_items i
         LEFT JOIN item_categories c
           ON c.id = i.category_id AND c.company_id = i.company_id
         JOIN units_of_measure u ON u.id = i.unit_id
         LEFT JOIN tax_rates t
           ON t.id = i.tax_rate_id AND t.company_id = i.company_id
         WHERE i.id = $1 AND i.company_id = $2 AND i.deleted_at IS NULL`,
        [id, companyId],
      )) as CatalogItemRow[];
      return rows[0] ? mapItem(rows[0]) : null;
    });
  }

  async findItemBySku(companyId: string, sku: string): Promise<CatalogItemRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT i.*, NULL::text AS category_name,
                u.code AS unit_code, u.name AS unit_name,
                NULL::text AS tax_name, NULL::float8 AS tax_rate
         FROM catalog_items i
         JOIN units_of_measure u ON u.id = i.unit_id
         WHERE i.company_id = $1 AND lower(i.sku) = lower($2) AND i.deleted_at IS NULL
         LIMIT 1`,
        [companyId, sku],
      )) as CatalogItemRow[];
      return rows[0] ? mapItem(rows[0]) : null;
    });
  }

  async createItem(
    companyId: string,
    userId: string,
    input: CreateCatalogItemInput,
  ): Promise<CatalogItemRow> {
    this.assertCompany(companyId);
    const id = await withTenantTransaction(
      this.dataSource,
      this.tenantContext,
      async (queryRunner) => {
        const rows = (await queryRunner.query(
          `INSERT INTO catalog_items
             (company_id, sku, name, description, item_type, category_id, unit_id,
              tax_rate_id, cost, price, currency_code, is_stockable, status,
              created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
           RETURNING id`,
          [
            companyId,
            input.sku,
            input.name,
            input.description ?? null,
            input.itemType,
            input.categoryId ?? null,
            input.unitId,
            input.taxRateId ?? null,
            input.cost,
            input.price,
            input.currencyCode,
            input.isStockable,
            input.status ?? 'active',
            userId,
          ],
        )) as Array<{ id: string }>;
        return rows[0]!.id;
      },
    );
    const item = await this.findItemById(companyId, id);
    return item!;
  }

  async updateItem(
    companyId: string,
    userId: string,
    id: string,
    input: Partial<CreateCatalogItemInput>,
  ): Promise<CatalogItemRow | null> {
    this.assertCompany(companyId);
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(
        {
          sku: input.sku,
          name: input.name,
          description: input.description,
          item_type: input.itemType,
          category_id: input.categoryId,
          unit_id: input.unitId,
          tax_rate_id: input.taxRateId,
          cost: input.cost,
          price: input.price,
          currency_code: input.currencyCode,
          is_stockable: input.isStockable,
          status: input.status,
          updated_by: userId,
        },
        [
          'sku',
          'name',
          'description',
          'item_type',
          'category_id',
          'unit_id',
          'tax_rate_id',
          'cost',
          'price',
          'currency_code',
          'is_stockable',
          'status',
          'updated_by',
        ],
        {
          nullEmptyStrings: ['description', 'category_id', 'tax_rate_id'],
          extraSet: ['updated_at = now()'],
        },
      );
      values.push(id, companyId);
      await queryRunner.query(
        `UPDATE catalog_items
         SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL`,
        values,
      );
    });
    return this.findItemById(companyId, id);
  }

  async deleteItem(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE catalog_items
         SET deleted_at = now(), status = 'inactive'
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async unitExists(companyId: string, unitId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM units_of_measure
         WHERE id = $1 AND (company_id IS NULL OR company_id = $2)
           AND deleted_at IS NULL`,
        [unitId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async taxRateExists(companyId: string, taxRateId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM tax_rates
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [taxRateId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async currencyExists(code: string): Promise<boolean> {
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT code FROM currencies WHERE code = $1 AND is_active`,
        [code],
      )) as Array<{ code: string }>;
      return Boolean(rows[0]);
    });
  }

  // ─── Listas de precios ────────────────────────────────────────────────────
  async listPriceLists(companyId: string): Promise<PriceListRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      return (await queryRunner.query(
        `SELECT pl.*,
                (SELECT COUNT(*)::int FROM item_prices ip WHERE ip.price_list_id = pl.id)
                  AS prices_count
         FROM price_lists pl
         WHERE pl.company_id = $1 AND pl.deleted_at IS NULL
         ORDER BY pl.is_default DESC, pl.name`,
        [companyId],
      )) as PriceListRow[];
    });
  }

  async findPriceListById(companyId: string, id: string): Promise<PriceListRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT pl.*, 0 AS prices_count FROM price_lists pl
         WHERE pl.id = $1 AND pl.company_id = $2 AND pl.deleted_at IS NULL`,
        [id, companyId],
      )) as PriceListRow[];
      return rows[0] ?? null;
    });
  }

  async findPriceListByCode(companyId: string, code: string): Promise<PriceListRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT pl.*, 0 AS prices_count FROM price_lists pl
         WHERE pl.company_id = $1 AND lower(pl.code) = lower($2) AND pl.deleted_at IS NULL
         LIMIT 1`,
        [companyId, code],
      )) as PriceListRow[];
      return rows[0] ?? null;
    });
  }

  async createPriceList(companyId: string, input: CreatePriceListInput): Promise<PriceListRow> {
    this.assertCompany(companyId);
    const id = await withTenantTransaction(
      this.dataSource,
      this.tenantContext,
      async (queryRunner) => {
        if (input.isDefault) {
          await queryRunner.query(
            `UPDATE price_lists SET is_default = false
             WHERE company_id = $1 AND is_default AND deleted_at IS NULL`,
            [companyId],
          );
        }
        const rows = (await queryRunner.query(
          `INSERT INTO price_lists
             (company_id, code, name, currency_code, is_default, valid_from,
              valid_to, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [
            companyId,
            input.code,
            input.name,
            input.currencyCode,
            input.isDefault,
            input.validFrom ?? null,
            input.validTo ?? null,
            input.isActive,
          ],
        )) as Array<{ id: string }>;
        return rows[0]!.id;
      },
    );
    const list = await this.findPriceListById(companyId, id);
    return list!;
  }

  async updatePriceList(
    companyId: string,
    id: string,
    input: Partial<CreatePriceListInput>,
  ): Promise<PriceListRow | null> {
    this.assertCompany(companyId);
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      if (input.isDefault) {
        await queryRunner.query(
          `UPDATE price_lists SET is_default = false
           WHERE company_id = $1 AND is_default AND id <> $2 AND deleted_at IS NULL`,
          [companyId, id],
        );
      }
      const { updates, values, startIndex } = buildDynamicUpdate(
        {
          code: input.code,
          name: input.name,
          currency_code: input.currencyCode,
          is_default: input.isDefault,
          valid_from: input.validFrom,
          valid_to: input.validTo,
          is_active: input.isActive,
        },
        ['code', 'name', 'currency_code', 'is_default', 'valid_from', 'valid_to', 'is_active'],
        { nullEmptyStrings: ['valid_from', 'valid_to'], extraSet: ['updated_at = now()'] },
      );
      values.push(id, companyId);
      await queryRunner.query(
        `UPDATE price_lists
         SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
           AND deleted_at IS NULL`,
        values,
      );
    });
    return this.findPriceListById(companyId, id);
  }

  async deletePriceList(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE price_lists SET deleted_at = now(), is_active = false
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async listItemPrices(companyId: string, priceListId: string): Promise<ItemPriceRow[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT ip.*, i.sku AS item_sku, i.name AS item_name
         FROM item_prices ip
         JOIN catalog_items i ON i.id = ip.item_id AND i.company_id = ip.company_id
         WHERE ip.company_id = $1 AND ip.price_list_id = $2
         ORDER BY i.name, ip.min_quantity`,
        [companyId, priceListId],
      )) as ItemPriceRow[];
      return rows.map(mapItemPrice);
    });
  }

  async findItemPriceById(companyId: string, id: string): Promise<ItemPriceRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT ip.*, i.sku AS item_sku, i.name AS item_name
         FROM item_prices ip
         JOIN catalog_items i ON i.id = ip.item_id AND i.company_id = ip.company_id
         WHERE ip.id = $1 AND ip.company_id = $2`,
        [id, companyId],
      )) as ItemPriceRow[];
      return rows[0] ? mapItemPrice(rows[0]) : null;
    });
  }

  async findDuplicateItemPrice(
    companyId: string,
    priceListId: string,
    itemId: string,
    minQuantity: number,
    excludeId?: string,
  ): Promise<ItemPriceRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT ip.*, ''::text AS item_sku, ''::text AS item_name
         FROM item_prices ip
         WHERE ip.company_id = $1 AND ip.price_list_id = $2 AND ip.item_id = $3
           AND ip.min_quantity = $4 AND ($5::uuid IS NULL OR ip.id <> $5)
         LIMIT 1`,
        [companyId, priceListId, itemId, minQuantity, excludeId ?? null],
      )) as ItemPriceRow[];
      return rows[0] ? mapItemPrice(rows[0]) : null;
    });
  }

  async createItemPrice(
    companyId: string,
    priceListId: string,
    input: CreateItemPriceInput,
  ): Promise<ItemPriceRow> {
    this.assertCompany(companyId);
    const id = await withTenantTransaction(
      this.dataSource,
      this.tenantContext,
      async (queryRunner) => {
        const rows = (await queryRunner.query(
          `INSERT INTO item_prices
             (company_id, price_list_id, item_id, price, min_quantity,
              valid_from, valid_to)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            companyId,
            priceListId,
            input.itemId,
            input.price,
            input.minQuantity,
            input.validFrom ?? null,
            input.validTo ?? null,
          ],
        )) as Array<{ id: string }>;
        return rows[0]!.id;
      },
    );
    const price = await this.findItemPriceById(companyId, id);
    return price!;
  }

  async updateItemPrice(
    companyId: string,
    id: string,
    input: UpdateItemPriceInput,
  ): Promise<ItemPriceRow | null> {
    this.assertCompany(companyId);
    await withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const { updates, values, startIndex } = buildDynamicUpdate(
        {
          price: input.price,
          min_quantity: input.minQuantity,
          valid_from: input.validFrom,
          valid_to: input.validTo,
        },
        ['price', 'min_quantity', 'valid_from', 'valid_to'],
        { nullEmptyStrings: ['valid_from', 'valid_to'], extraSet: ['updated_at = now()'] },
      );
      values.push(id, companyId);
      await queryRunner.query(
        `UPDATE item_prices
         SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND company_id = $${startIndex + 1}`,
        values,
      );
    });
    return this.findItemPriceById(companyId, id);
  }

  async deleteItemPrice(companyId: string, id: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `DELETE FROM item_prices WHERE id = $1 AND company_id = $2 RETURNING id`,
        [id, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async itemBelongs(companyId: string, itemId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM catalog_items
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [itemId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }
}

function mapItem(row: CatalogItemRow): CatalogItemRow {
  return { ...row, cost: Number(row.cost), price: Number(row.price) };
}

function mapItemPrice(row: ItemPriceRow): ItemPriceRow {
  return {
    ...row,
    price: Number(row.price),
    min_quantity: Number(row.min_quantity),
  };
}
