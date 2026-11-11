import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CatalogItemsRepository } from './items.repository.js';
import { EntitlementService } from '../kernel/billing/entitlement.service.js';
import { CATALOG_MODULE_CODE } from './catalog.service.js';
import {
  ITEM_STATUSES,
  ITEM_TYPES,
  type CatalogItemRow,
  type CreateCatalogItemInput,
  type CreateItemCategoryInput,
  type CreateItemPriceInput,
  type CreatePriceListInput,
  type ItemCategoryRow,
  type ItemListFilters,
  type ItemPriceRow,
  type PriceListRow,
  type UpdateCatalogItemInput,
  type UpdateItemPriceInput,
  type UpdatePriceListInput,
} from './items.types.js';

@Injectable()
export class CatalogItemsService {
  constructor(
    private readonly repository: CatalogItemsRepository,
    private readonly entitlements: EntitlementService,
  ) {}

  // ─── Categorías ───────────────────────────────────────────────────────────
  listCategories(companyId: string): Promise<ItemCategoryRow[]> {
    return this.repository.listCategories(companyId);
  }

  async createCategory(
    companyId: string,
    input: CreateItemCategoryInput,
  ): Promise<ItemCategoryRow> {
    await this.assertWritable(companyId);
    const name = requiredText(input.name, 'El nombre es obligatorio');
    const parent = input.parentId
      ? await this.repository.findCategoryById(companyId, input.parentId)
      : null;
    if (input.parentId && !parent) {
      throw new NotFoundException('Categoría padre no encontrada');
    }
    const id = randomUUID();
    const path = parent ? `${parent.path}/${id}` : `/${id}`;
    try {
      return await this.repository.createCategory(companyId, id, { name, parentId: input.parentId ?? null }, path);
    } catch (error) {
      throw mapUniqueViolation(error, 'Ya existe una categoría con ese nombre');
    }
  }

  async updateCategory(
    companyId: string,
    id: string,
    input: Partial<CreateItemCategoryInput>,
  ): Promise<ItemCategoryRow> {
    await this.assertWritable(companyId);
    const current = await this.repository.findCategoryById(companyId, id);
    if (!current) throw new NotFoundException('Categoría no encontrada');

    const name = input.name === undefined ? undefined : requiredText(input.name, 'El nombre es obligatorio');
    let parentId = input.parentId === undefined ? current.parent_id : input.parentId;
    let path = current.path;

    if (parentId !== current.parent_id) {
      if (parentId === id) throw new BadRequestException('Una categoría no puede ser su propio padre');
      const parent = parentId ? await this.repository.findCategoryById(companyId, parentId) : null;
      if (parentId && !parent) throw new NotFoundException('Categoría padre no encontrada');
      if (parent && parent.path.startsWith(`${current.path}/`)) {
        throw new BadRequestException('No se puede mover una categoría dentro de su descendencia');
      }
      path = parent ? `${parent.path}/${id}` : `/${id}`;
    }

    try {
      const updated = await this.repository.updateCategory(companyId, id, { name, parentId, path });
      if (!updated) throw new NotFoundException('Categoría no encontrada');
      if (path !== current.path) {
        await this.repository.updateDescendantPaths(companyId, current.path, path);
      }
      return updated;
    } catch (error) {
      throw mapUniqueViolation(error, 'Ya existe una categoría con ese nombre');
    }
  }

  async deleteCategory(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const current = await this.repository.findCategoryById(companyId, id);
    if (!current) throw new NotFoundException('Categoría no encontrada');
    const [children, items] = await Promise.all([
      this.repository.countCategoryChildren(companyId, id),
      this.repository.countCategoryItems(companyId, id),
    ]);
    if (children > 0) {
      throw new ConflictException('No se puede eliminar una categoría con subcategorías');
    }
    if (items > 0) {
      throw new ConflictException('No se puede eliminar una categoría con ítems asociados');
    }
    const deleted = await this.repository.deleteCategory(companyId, id);
    if (!deleted) throw new NotFoundException('Categoría no encontrada');
  }

  // ─── Ítems ────────────────────────────────────────────────────────────────
  listItems(
    companyId: string,
    filters: ItemListFilters,
  ): Promise<{ data: CatalogItemRow[]; total: number }> {
    return this.repository.listItems(companyId, filters);
  }

  async getItem(companyId: string, id: string): Promise<CatalogItemRow> {
    const item = await this.repository.findItemById(companyId, id);
    if (!item) throw new NotFoundException('Ítem no encontrado');
    return item;
  }

  async createItem(
    companyId: string,
    userId: string,
    input: CreateCatalogItemInput,
  ): Promise<CatalogItemRow> {
    await this.assertWritable(companyId);
    await this.validateItemInput(companyId, input);
    const sku = input.sku.trim();
    if (await this.repository.findItemBySku(companyId, sku)) {
      throw new ConflictException('Ya existe un ítem con ese SKU');
    }
    try {
      return await this.repository.createItem(companyId, userId, {
        ...input,
        sku,
        name: input.name.trim(),
      });
    } catch (error) {
      throw mapUniqueViolation(error, 'Ya existe un ítem con ese SKU');
    }
  }

  async updateItem(
    companyId: string,
    userId: string,
    id: string,
    input: UpdateCatalogItemInput,
  ): Promise<CatalogItemRow> {
    await this.assertWritable(companyId);
    const current = await this.getItem(companyId, id);
    const sku = input.sku?.trim();
    if (sku !== undefined && sku.toLowerCase() !== current.sku.toLowerCase()) {
      const existing = await this.repository.findItemBySku(companyId, sku);
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe un ítem con ese SKU');
      }
    }
    await this.validateItemInput(companyId, {
      ...current,
      ...input,
      unitId: input.unitId ?? current.unit_id,
      itemType: input.itemType ?? current.item_type,
      cost: input.cost ?? current.cost,
      price: input.price ?? current.price,
      currencyCode: input.currencyCode ?? current.currency_code,
      isStockable: input.isStockable ?? current.is_stockable,
    } as CreateCatalogItemInput);

    const updated = await this.repository.updateItem(companyId, userId, id, {
      ...input,
      sku,
      name: input.name?.trim(),
    });
    if (!updated) throw new NotFoundException('Ítem no encontrado');
    return updated;
  }

  async deleteItem(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deleteItem(companyId, id);
    if (!deleted) throw new NotFoundException('Ítem no encontrado');
  }

  private async validateItemInput(
    companyId: string,
    input: CreateCatalogItemInput,
  ): Promise<void> {
    requiredText(input.sku, 'El SKU es obligatorio');
    requiredText(input.name, 'El nombre es obligatorio');
    if (!ITEM_TYPES.includes(input.itemType)) {
      throw new BadRequestException('Tipo de ítem inválido');
    }
    if (input.status && !ITEM_STATUSES.includes(input.status)) {
      throw new BadRequestException('Estado de ítem inválido');
    }
    if (!Number.isFinite(input.cost) || input.cost < 0) {
      throw new BadRequestException('El costo debe ser mayor o igual a cero');
    }
    if (!Number.isFinite(input.price) || input.price < 0) {
      throw new BadRequestException('El precio debe ser mayor o igual a cero');
    }
    if (!(await this.repository.unitExists(companyId, input.unitId))) {
      throw new BadRequestException('La unidad no existe o no está disponible');
    }
    if (input.taxRateId && !(await this.repository.taxRateExists(companyId, input.taxRateId))) {
      throw new BadRequestException('El impuesto no existe');
    }
    if (input.categoryId) {
      const category = await this.repository.findCategoryById(companyId, input.categoryId);
      if (!category) throw new BadRequestException('La categoría no existe');
    }
    if (!(await this.repository.currencyExists(input.currencyCode))) {
      throw new BadRequestException('La moneda no existe');
    }
  }

  // ─── Listas de precios ────────────────────────────────────────────────────
  listPriceLists(companyId: string): Promise<PriceListRow[]> {
    return this.repository.listPriceLists(companyId);
  }

  async createPriceList(
    companyId: string,
    input: CreatePriceListInput,
  ): Promise<PriceListRow> {
    await this.assertWritable(companyId);
    const code = requiredText(input.code, 'El código es obligatorio').toLowerCase();
    const name = requiredText(input.name, 'El nombre es obligatorio');
    await this.validatePriceListInput(input);
    if (await this.repository.findPriceListByCode(companyId, code)) {
      throw new ConflictException('Ya existe una lista de precios con ese código');
    }
    try {
      return await this.repository.createPriceList(companyId, {
        ...input,
        code,
        name,
      });
    } catch (error) {
      throw mapUniqueViolation(error, 'Ya existe una lista de precios con ese código');
    }
  }

  async updatePriceList(
    companyId: string,
    id: string,
    input: UpdatePriceListInput,
  ): Promise<PriceListRow> {
    await this.assertWritable(companyId);
    const current = await this.repository.findPriceListById(companyId, id);
    if (!current) throw new NotFoundException('Lista de precios no encontrada');
    if (input.code) {
      const code = input.code.trim().toLowerCase();
      const existing = await this.repository.findPriceListByCode(companyId, code);
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe una lista de precios con ese código');
      }
      input = { ...input, code };
    }
    await this.validatePriceListInput({
      code: input.code ?? current.code,
      name: input.name ?? current.name,
      currencyCode: input.currencyCode ?? current.currency_code,
      isDefault: input.isDefault ?? current.is_default,
      validFrom: input.validFrom === undefined ? current.valid_from : input.validFrom,
      validTo: input.validTo === undefined ? current.valid_to : input.validTo,
      isActive: input.isActive ?? current.is_active,
    });
    const updated = await this.repository.updatePriceList(companyId, id, input);
    if (!updated) throw new NotFoundException('Lista de precios no encontrada');
    return updated;
  }

  async deletePriceList(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deletePriceList(companyId, id);
    if (!deleted) throw new NotFoundException('Lista de precios no encontrada');
  }

  private async validatePriceListInput(input: CreatePriceListInput): Promise<void> {
    requiredText(input.code, 'El código es obligatorio');
    requiredText(input.name, 'El nombre es obligatorio');
    if (!(await this.repository.currencyExists(input.currencyCode))) {
      throw new BadRequestException('La moneda no existe');
    }
    if (input.validFrom && input.validTo && input.validTo < input.validFrom) {
      throw new BadRequestException('La vigencia final no puede ser anterior a la inicial');
    }
  }

  // ─── Precios por ítem ─────────────────────────────────────────────────────
  async listItemPrices(companyId: string, priceListId: string): Promise<ItemPriceRow[]> {
    const list = await this.repository.findPriceListById(companyId, priceListId);
    if (!list) throw new NotFoundException('Lista de precios no encontrada');
    return this.repository.listItemPrices(companyId, priceListId);
  }

  async createItemPrice(
    companyId: string,
    priceListId: string,
    input: CreateItemPriceInput,
  ): Promise<ItemPriceRow> {
    await this.assertWritable(companyId);
    const list = await this.repository.findPriceListById(companyId, priceListId);
    if (!list) throw new NotFoundException('Lista de precios no encontrada');
    if (!(await this.repository.itemBelongs(companyId, input.itemId))) {
      throw new BadRequestException('El ítem no existe');
    }
    validatePrice(input.price, input.minQuantity, input.validFrom, input.validTo);
    if (await this.repository.findDuplicateItemPrice(companyId, priceListId, input.itemId, input.minQuantity)) {
      throw new ConflictException('Ya existe un precio para ese ítem y cantidad mínima');
    }
    try {
      return await this.repository.createItemPrice(companyId, priceListId, input);
    } catch (error) {
      throw mapUniqueViolation(error, 'Ya existe un precio para ese ítem y cantidad mínima');
    }
  }

  async updateItemPrice(
    companyId: string,
    id: string,
    input: UpdateItemPriceInput,
  ): Promise<ItemPriceRow> {
    await this.assertWritable(companyId);
    const current = await this.repository.findItemPriceById(companyId, id);
    if (!current) throw new NotFoundException('Precio no encontrado');
    const price = input.price ?? current.price;
    const minQuantity = input.minQuantity ?? current.min_quantity;
    const validFrom = input.validFrom === undefined ? current.valid_from : input.validFrom;
    const validTo = input.validTo === undefined ? current.valid_to : input.validTo;
    validatePrice(price, minQuantity, validFrom, validTo);
    if (await this.repository.findDuplicateItemPrice(companyId, current.price_list_id, current.item_id, minQuantity, id)) {
      throw new ConflictException('Ya existe un precio para ese ítem y cantidad mínima');
    }
    const updated = await this.repository.updateItemPrice(companyId, id, {
      ...input,
      price,
      minQuantity,
    });
    if (!updated) throw new NotFoundException('Precio no encontrado');
    return updated;
  }

  async deleteItemPrice(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deleteItemPrice(companyId, id);
    if (!deleted) throw new NotFoundException('Precio no encontrado');
  }

  private assertWritable(companyId: string): Promise<void> {
    return this.entitlements.assertWritableModule(companyId, CATALOG_MODULE_CODE);
  }
}

function requiredText(value: string | null | undefined, message: string): string {
  const text = value?.trim();
  if (!text) throw new BadRequestException(message);
  return text;
}

function validatePrice(
  price: number,
  minQuantity: number,
  validFrom?: string | null,
  validTo?: string | null,
): void {
  if (!Number.isFinite(price) || price < 0) {
    throw new BadRequestException('El precio debe ser mayor o igual a cero');
  }
  if (!Number.isFinite(minQuantity) || minQuantity <= 0) {
    throw new BadRequestException('La cantidad mínima debe ser mayor a cero');
  }
  if (validFrom && validTo && validTo < validFrom) {
    throw new BadRequestException('La vigencia final no puede ser anterior a la inicial');
  }
}

function mapUniqueViolation(error: unknown, message: string): Error {
  if ((error as { code?: string })?.code === '23505') {
    return new ConflictException(message);
  }
  return error as Error;
}
