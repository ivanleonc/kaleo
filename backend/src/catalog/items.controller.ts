import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CatalogItemsService } from './items.service.js';
import {
  CreateCatalogItemDto,
  CreateItemCategoryDto,
  CreateItemPriceDto,
  CreatePriceListDto,
  ItemQueryDto,
  UpdateCatalogItemDto,
  UpdateItemCategoryDto,
  UpdateItemPriceDto,
  UpdatePriceListDto,
} from './dto/items.dto.js';
import { Ok, OkPaged } from '../common/dto/api-response.dto.js';
import { Permissions } from '../common/constants/permissions.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

@ApiTags('Catalog - Ítems y precios')
@ApiBearerAuth()
@Controller('api/catalog')
@UseGuards(PermissionsGuard)
@ApiHeader({ name: 'x-company-id', required: true })
export class CatalogItemsController {
  constructor(private readonly items: CatalogItemsService) {}

  @Get('item-categories')
  @RequirePermissions(Permissions.CATALOG.READ)
  @ApiOperation({ summary: 'Categorías de ítems' })
  async categories(@Headers('x-company-id') companyId: string | undefined) {
    return Ok(await this.items.listCategories(requireCompany(companyId)));
  }

  @Post('item-categories')
  @RequirePermissions(Permissions.CATALOG.CREATE)
  @Audit({ entityType: 'Catalog', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear categoría de ítems' })
  async createCategory(
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: CreateItemCategoryDto,
  ) {
    return Ok(
      await this.items.createCategory(requireCompany(companyId), dto),
      'Categoría creada',
    );
  }

  @Patch('item-categories/:id')
  @RequirePermissions(Permissions.CATALOG.UPDATE)
  @Audit({ entityType: 'Catalog', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar categoría de ítems' })
  async updateCategory(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemCategoryDto,
  ) {
    return Ok(
      await this.items.updateCategory(requireCompany(companyId), id, dto),
      'Categoría actualizada',
    );
  }

  @Delete('item-categories/:id')
  @RequirePermissions(Permissions.CATALOG.DELETE)
  @Audit({ entityType: 'Catalog', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar categoría de ítems' })
  async deleteCategory(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.items.deleteCategory(requireCompany(companyId), id);
    return Ok(undefined, 'Categoría eliminada');
  }

  @Get('items')
  @RequirePermissions(Permissions.CATALOG.READ)
  @ApiOperation({ summary: 'Listar ítems de catálogo' })
  async listItems(
    @Headers('x-company-id') companyId: string | undefined,
    @Query() query: ItemQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const result = await this.items.listItems(requireCompany(companyId), {
      search: query.search?.trim() || undefined,
      categoryId: query.categoryId,
      itemType: query.itemType,
      status: query.status,
      page,
      limit,
    });
    return OkPaged(result.data, result.total, page, limit);
  }

  @Post('items')
  @RequirePermissions(Permissions.CATALOG.CREATE)
  @Audit({ entityType: 'Catalog', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear ítem de catálogo' })
  async createItem(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: CreateCatalogItemDto,
  ) {
    return Ok(
      await this.items.createItem(requireCompany(companyId), userId, {
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        itemType: dto.itemType,
        categoryId: dto.categoryId,
        unitId: dto.unitId,
        taxRateId: dto.taxRateId,
        cost: dto.cost,
        price: dto.price,
        currencyCode: dto.currencyCode.toUpperCase(),
        isStockable: dto.isStockable ?? dto.itemType === 'product',
        status: dto.status,
      }),
      'Ítem creado',
    );
  }

  @Get('items/:id')
  @RequirePermissions(Permissions.CATALOG.READ)
  @ApiOperation({ summary: 'Detalle de un ítem' })
  async getItem(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(await this.items.getItem(requireCompany(companyId), id));
  }

  @Patch('items/:id')
  @RequirePermissions(Permissions.CATALOG.UPDATE)
  @Audit({ entityType: 'Catalog', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar ítem de catálogo' })
  async updateItem(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogItemDto,
  ) {
    return Ok(
      await this.items.updateItem(requireCompany(companyId), userId, id, {
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        itemType: dto.itemType,
        categoryId: dto.categoryId,
        unitId: dto.unitId,
        taxRateId: dto.taxRateId,
        cost: dto.cost,
        price: dto.price,
        currencyCode: dto.currencyCode?.toUpperCase(),
        isStockable: dto.isStockable,
        status: dto.status,
      }),
      'Ítem actualizado',
    );
  }

  @Delete('items/:id')
  @RequirePermissions(Permissions.CATALOG.DELETE)
  @Audit({ entityType: 'Catalog', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar ítem de catálogo' })
  async deleteItem(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.items.deleteItem(requireCompany(companyId), id);
    return Ok(undefined, 'Ítem eliminado');
  }

  @Get('price-lists')
  @RequirePermissions(Permissions.CATALOG.READ)
  @ApiOperation({ summary: 'Listas de precios' })
  async priceLists(@Headers('x-company-id') companyId: string | undefined) {
    return Ok(await this.items.listPriceLists(requireCompany(companyId)));
  }

  @Post('price-lists')
  @RequirePermissions(Permissions.CATALOG.CREATE)
  @Audit({ entityType: 'Catalog', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear lista de precios' })
  async createPriceList(
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: CreatePriceListDto,
  ) {
    return Ok(
      await this.items.createPriceList(requireCompany(companyId), {
        code: dto.code,
        name: dto.name,
        currencyCode: dto.currencyCode.toUpperCase(),
        isDefault: dto.isDefault ?? false,
        validFrom: dto.validFrom,
        validTo: dto.validTo,
        isActive: dto.isActive ?? true,
      }),
      'Lista de precios creada',
    );
  }

  @Patch('price-lists/:id')
  @RequirePermissions(Permissions.CATALOG.UPDATE)
  @Audit({ entityType: 'Catalog', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar lista de precios' })
  async updatePriceList(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriceListDto,
  ) {
    return Ok(
      await this.items.updatePriceList(requireCompany(companyId), id, {
        code: dto.code,
        name: dto.name,
        currencyCode: dto.currencyCode?.toUpperCase(),
        isDefault: dto.isDefault,
        validFrom: dto.validFrom,
        validTo: dto.validTo,
        isActive: dto.isActive,
      }),
      'Lista de precios actualizada',
    );
  }

  @Delete('price-lists/:id')
  @RequirePermissions(Permissions.CATALOG.DELETE)
  @Audit({ entityType: 'Catalog', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar lista de precios' })
  async deletePriceList(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.items.deletePriceList(requireCompany(companyId), id);
    return Ok(undefined, 'Lista de precios eliminada');
  }

  @Get('price-lists/:id/prices')
  @RequirePermissions(Permissions.CATALOG.READ)
  @ApiOperation({ summary: 'Precios de una lista' })
  async itemPrices(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(await this.items.listItemPrices(requireCompany(companyId), id));
  }

  @Post('price-lists/:id/prices')
  @RequirePermissions(Permissions.CATALOG.CREATE)
  @Audit({ entityType: 'Catalog', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Agregar precio a una lista' })
  async createItemPrice(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateItemPriceDto,
  ) {
    return Ok(
      await this.items.createItemPrice(requireCompany(companyId), id, {
        itemId: dto.itemId,
        price: dto.price,
        minQuantity: dto.minQuantity ?? 1,
        validFrom: dto.validFrom,
        validTo: dto.validTo,
      }),
      'Precio agregado',
    );
  }

  @Patch('price-lists/:id/prices/:priceId')
  @RequirePermissions(Permissions.CATALOG.UPDATE)
  @Audit({ entityType: 'Catalog', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar precio de una lista' })
  async updateItemPrice(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('priceId', ParseUUIDPipe) priceId: string,
    @Body() dto: UpdateItemPriceDto,
  ) {
    return Ok(
      await this.items.updateItemPrice(requireCompany(companyId), priceId, dto),
      'Precio actualizado',
    );
  }

  @Delete('price-lists/:id/prices/:priceId')
  @RequirePermissions(Permissions.CATALOG.DELETE)
  @Audit({ entityType: 'Catalog', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar precio de una lista' })
  async deleteItemPrice(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('priceId', ParseUUIDPipe) priceId: string,
  ) {
    await this.items.deleteItemPrice(requireCompany(companyId), priceId);
    return Ok(undefined, 'Precio eliminado');
  }
}

function requireCompany(companyId: string | undefined): string {
  if (!companyId) throw new BadRequestException('Falta el header x-company-id');
  return companyId;
}
