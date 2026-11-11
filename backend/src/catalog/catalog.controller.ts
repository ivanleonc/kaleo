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
import { CatalogService } from './catalog.service.js';
import {
  CreateTaxRateDto,
  CreateUnitConversionDto,
  CreateUnitDto,
  TaxRateQueryDto,
  UnitQueryDto,
  UpdateTaxRateDto,
  UpdateUnitDto,
} from './dto/catalog.dto.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { Permissions } from '../common/constants/permissions.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

@ApiTags('Catalog - Catálogo')
@ApiBearerAuth()
@Controller('api/catalog')
@UseGuards(PermissionsGuard)
@ApiHeader({ name: 'x-company-id', required: true })
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('currencies')
  @RequirePermissions(Permissions.CATALOG.READ)
  @ApiOperation({ summary: 'Monedas disponibles' })
  async currencies() {
    return Ok(await this.catalog.listCurrencies());
  }

  @Get('units')
  @RequirePermissions(Permissions.CATALOG.READ)
  @ApiOperation({ summary: 'Unidades de medida globales y de la empresa' })
  async units(
    @Headers('x-company-id') companyId: string | undefined,
    @Query() query: UnitQueryDto,
  ) {
    return Ok(
      await this.catalog.listUnits(requireCompany(companyId), {
        search: query.search?.trim() || undefined,
        kind: query.kind,
        includeInactive: query.includeInactive === 'true',
      }),
    );
  }

  @Post('units')
  @RequirePermissions(Permissions.CATALOG.CREATE)
  @Audit({ entityType: 'Catalog', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear una unidad de medida de la empresa' })
  async createUnit(
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: CreateUnitDto,
  ) {
    return Ok(
      await this.catalog.createUnit(requireCompany(companyId), {
        code: dto.code,
        name: dto.name,
        kind: dto.kind,
        precision: dto.precision ?? 2,
        isActive: dto.isActive,
      }),
      'Unidad creada',
    );
  }

  @Patch('units/:id')
  @RequirePermissions(Permissions.CATALOG.UPDATE)
  @Audit({ entityType: 'Catalog', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar una unidad de medida de la empresa' })
  async updateUnit(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return Ok(
      await this.catalog.updateUnit(requireCompany(companyId), id, dto),
      'Unidad actualizada',
    );
  }

  @Delete('units/:id')
  @RequirePermissions(Permissions.CATALOG.DELETE)
  @Audit({ entityType: 'Catalog', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar una unidad de medida de la empresa' })
  async deleteUnit(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.catalog.deleteUnit(requireCompany(companyId), id);
    return Ok(undefined, 'Unidad eliminada');
  }

  @Get('units/:id/conversions')
  @RequirePermissions(Permissions.CATALOG.READ)
  @ApiOperation({ summary: 'Conversiones que involucran una unidad' })
  async conversions(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(await this.catalog.listConversions(requireCompany(companyId), id));
  }

  @Post('units/:id/conversions')
  @RequirePermissions(Permissions.CATALOG.CREATE)
  @Audit({ entityType: 'Catalog', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear una conversión desde una unidad' })
  async createConversion(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateUnitConversionDto,
  ) {
    return Ok(
      await this.catalog.addConversion(requireCompany(companyId), id, dto),
      'Conversión creada',
    );
  }

  @Delete('units/:id/conversions/:conversionId')
  @RequirePermissions(Permissions.CATALOG.DELETE)
  @Audit({ entityType: 'Catalog', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar una conversión de la empresa' })
  async deleteConversion(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('conversionId', ParseUUIDPipe) conversionId: string,
  ) {
    await this.catalog.deleteConversion(requireCompany(companyId), conversionId);
    return Ok(undefined, 'Conversión eliminada');
  }

  @Get('tax-rates')
  @RequirePermissions(Permissions.CATALOG.READ)
  @ApiOperation({ summary: 'Impuestos de la empresa' })
  async taxRates(
    @Headers('x-company-id') companyId: string | undefined,
    @Query() query: TaxRateQueryDto,
  ) {
    return Ok(
      await this.catalog.listTaxRates(requireCompany(companyId), {
        search: query.search?.trim() || undefined,
        includeInactive: query.includeInactive === 'true',
      }),
    );
  }

  @Post('tax-rates')
  @RequirePermissions(Permissions.CATALOG.CREATE)
  @Audit({ entityType: 'Catalog', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear un impuesto' })
  async createTaxRate(
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: CreateTaxRateDto,
  ) {
    return Ok(
      await this.catalog.createTaxRate(requireCompany(companyId), dto),
      'Impuesto creado',
    );
  }

  @Patch('tax-rates/:id')
  @RequirePermissions(Permissions.CATALOG.UPDATE)
  @Audit({ entityType: 'Catalog', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar un impuesto' })
  async updateTaxRate(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaxRateDto,
  ) {
    return Ok(
      await this.catalog.updateTaxRate(requireCompany(companyId), id, dto),
      'Impuesto actualizado',
    );
  }

  @Delete('tax-rates/:id')
  @RequirePermissions(Permissions.CATALOG.DELETE)
  @Audit({ entityType: 'Catalog', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar un impuesto' })
  async deleteTaxRate(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.catalog.deleteTaxRate(requireCompany(companyId), id);
    return Ok(undefined, 'Impuesto eliminado');
  }
}

function requireCompany(companyId: string | undefined): string {
  if (!companyId) throw new BadRequestException('Falta el header x-company-id');
  return companyId;
}
