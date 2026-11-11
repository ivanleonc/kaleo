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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EstimatingService } from './estimating.service.js';
import {
  ApuQueryDto,
  CreateApuBaseDto,
  CreateApuDto,
  CreateApuLineDto,
  CreateResourceDto,
  CreateResourcePriceDto,
  ImportApusDto,
  ResourceQueryDto,
  UpdateApuBaseDto,
  UpdateApuDto,
  UpdateApuLineDto,
  UpdateResourceDto,
} from './dto/estimating.dto.js';
import {
  mapRecords,
  parseTabularMatrix,
} from '../common/import/tabular-import.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { Permissions } from '../common/constants/permissions.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

const APU_IMPORT_ALIASES: Record<string, string> = {
  apu_codigo: 'apu_code',
  apu_code: 'apu_code',
  codigo_apu: 'apu_code',
  apu: 'apu_code',
  apu_nombre: 'apu_name',
  nombre_apu: 'apu_name',
  actividad: 'apu_name',
  descripcion_apu: 'apu_name',
  apu_unidad: 'apu_unit',
  unidad_apu: 'apu_unit',
  unidad_salida: 'apu_unit',
  unidad: 'apu_unit',
  insumo_codigo: 'resource_code',
  codigo_insumo: 'resource_code',
  codigo: 'resource_code',
  insumo_nombre: 'resource_name',
  nombre_insumo: 'resource_name',
  insumo: 'resource_name',
  nombre: 'resource_name',
  descripcion: 'resource_name',
  tipo: 'resource_type',
  tipo_insumo: 'resource_type',
  componente: 'resource_type',
  unidad_insumo: 'resource_unit',
  und_insumo: 'resource_unit',
  cantidad: 'quantity',
  qty: 'quantity',
  desperdicio: 'waste_pct',
  desperdicio_pct: 'waste_pct',
  rendimiento: 'performance',
  costo: 'cost',
  costo_unitario: 'cost',
  precio: 'cost',
  valor: 'cost',
  moneda: 'currency',
  notas: 'notes',
  nota: 'notes',
};

@ApiTags('Estimating - Estimación')
@ApiBearerAuth()
@Controller('api/estimating')
@UseGuards(PermissionsGuard)
@ApiHeader({ name: 'x-company-id', required: true })
export class EstimatingController {
  constructor(private readonly estimating: EstimatingService) {}

  @Get('resources')
  @RequirePermissions(Permissions.ESTIMATING.READ)
  @ApiOperation({ summary: 'Listar recursos de estimación' })
  async resources(
    @Headers('x-company-id') companyId: string | undefined,
    @Query() query: ResourceQueryDto,
  ) {
    return Ok(
      await this.estimating.listResources(requireCompany(companyId), {
        search: query.search?.trim() || undefined,
        resourceType: query.resourceType,
      }),
    );
  }

  @Post('resources')
  @RequirePermissions(Permissions.ESTIMATING.CREATE)
  @Audit({ entityType: 'Estimating', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear recurso de estimación' })
  async createResource(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: CreateResourceDto,
  ) {
    return Ok(
      await this.estimating.createResource(requireCompany(companyId), userId, dto),
      'Recurso creado',
    );
  }

  @Patch('resources/:id')
  @RequirePermissions(Permissions.ESTIMATING.UPDATE)
  @Audit({ entityType: 'Estimating', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar recurso' })
  async updateResource(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return Ok(
      await this.estimating.updateResource(requireCompany(companyId), userId, id, dto),
      'Recurso actualizado',
    );
  }

  @Delete('resources/:id')
  @RequirePermissions(Permissions.ESTIMATING.DELETE)
  @Audit({ entityType: 'Estimating', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar recurso' })
  async deleteResource(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.estimating.deleteResource(requireCompany(companyId), id);
    return Ok(undefined, 'Recurso eliminado');
  }

  @Get('resources/:id/prices')
  @RequirePermissions(Permissions.ESTIMATING.READ)
  @ApiOperation({ summary: 'Precios de proveedor del recurso' })
  async prices(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(await this.estimating.listResourcePrices(requireCompany(companyId), id));
  }

  @Post('resources/:id/prices')
  @RequirePermissions(Permissions.ESTIMATING.CREATE)
  @Audit({ entityType: 'Estimating', idParam: 'id' })
  @ApiOperation({ summary: 'Agregar precio de proveedor' })
  async addPrice(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateResourcePriceDto,
  ) {
    return Ok(
      await this.estimating.addResourcePrice(requireCompany(companyId), id, {
        supplierPartyId: dto.supplierPartyId,
        price: dto.price,
        currencyCode: dto.currencyCode.toUpperCase(),
        validFrom: dto.validFrom,
        validTo: dto.validTo,
        source: dto.source,
      }),
      'Precio agregado',
    );
  }

  @Delete('resources/:id/prices/:priceId')
  @RequirePermissions(Permissions.ESTIMATING.DELETE)
  @Audit({ entityType: 'Estimating', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar precio de proveedor' })
  async deletePrice(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('priceId', ParseUUIDPipe) priceId: string,
  ) {
    await this.estimating.deleteResourcePrice(requireCompany(companyId), id, priceId);
    return Ok(undefined, 'Precio eliminado');
  }

  @Get('apu-bases')
  @RequirePermissions(Permissions.ESTIMATING.READ)
  @ApiOperation({ summary: 'Bases de APUs' })
  async bases(@Headers('x-company-id') companyId: string | undefined) {
    return Ok(await this.estimating.listApuBases(requireCompany(companyId)));
  }

  @Post('apu-bases')
  @RequirePermissions(Permissions.ESTIMATING.CREATE)
  @Audit({ entityType: 'Estimating', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear base de APUs' })
  async createBase(
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: CreateApuBaseDto,
  ) {
    return Ok(
      await this.estimating.createApuBase(requireCompany(companyId), dto),
      'Base creada',
    );
  }

  @Patch('apu-bases/:id')
  @RequirePermissions(Permissions.ESTIMATING.UPDATE)
  @Audit({ entityType: 'Estimating', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar base de APUs' })
  async updateBase(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApuBaseDto,
  ) {
    return Ok(
      await this.estimating.updateApuBase(requireCompany(companyId), id, dto),
      'Base actualizada',
    );
  }

  @Delete('apu-bases/:id')
  @RequirePermissions(Permissions.ESTIMATING.DELETE)
  @Audit({ entityType: 'Estimating', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar base de APUs' })
  async deleteBase(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.estimating.deleteApuBase(requireCompany(companyId), id);
    return Ok(undefined, 'Base eliminada');
  }

  @Get('apus')
  @RequirePermissions(Permissions.ESTIMATING.READ)
  @ApiOperation({ summary: 'Listar APUs' })
  async apus(
    @Headers('x-company-id') companyId: string | undefined,
    @Query() query: ApuQueryDto,
  ) {
    return Ok(
      await this.estimating.listApus(requireCompany(companyId), {
        search: query.search?.trim() || undefined,
        baseId: query.baseId,
      }),
    );
  }

  @Post('apus')
  @RequirePermissions(Permissions.ESTIMATING.CREATE)
  @Audit({ entityType: 'Estimating', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear APU' })
  async createApu(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: CreateApuDto,
  ) {
    return Ok(
      await this.estimating.createApu(requireCompany(companyId), userId, dto),
      'APU creado',
    );
  }

  @Get('apus/:id')
  @RequirePermissions(Permissions.ESTIMATING.READ)
  @ApiOperation({ summary: 'Detalle de APU con insumos' })
  async getApu(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(await this.estimating.getApu(requireCompany(companyId), id));
  }

  @Patch('apus/:id')
  @RequirePermissions(Permissions.ESTIMATING.UPDATE)
  @Audit({ entityType: 'Estimating', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar APU' })
  async updateApu(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApuDto,
  ) {
    return Ok(
      await this.estimating.updateApu(requireCompany(companyId), userId, id, dto),
      'APU actualizado',
    );
  }

  @Delete('apus/:id')
  @RequirePermissions(Permissions.ESTIMATING.DELETE)
  @Audit({ entityType: 'Estimating', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar APU' })
  async deleteApu(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.estimating.deleteApu(requireCompany(companyId), id);
    return Ok(undefined, 'APU eliminado');
  }

  @Post('apus/:id/versions')
  @RequirePermissions(Permissions.ESTIMATING.UPDATE)
  @Audit({ entityType: 'Estimating', idParam: 'id' })
  @ApiOperation({ summary: 'Crear nueva versión de APU' })
  async createVersion(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(
      await this.estimating.createApuVersion(requireCompany(companyId), userId, id),
      'Versión creada',
    );
  }

  @Post('apus/:id/approve')
  @RequirePermissions(Permissions.ESTIMATING.UPDATE)
  @Audit({ entityType: 'Estimating', idParam: 'id' })
  @ApiOperation({ summary: 'Aprobar versión actual del APU' })
  async approveApu(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(
      await this.estimating.approveApu(requireCompany(companyId), userId, id),
      'APU aprobado',
    );
  }

  @Post('apus/:id/lines')
  @RequirePermissions(Permissions.ESTIMATING.UPDATE)
  @Audit({ entityType: 'Estimating', idParam: 'id' })
  @ApiOperation({ summary: 'Agregar insumo al APU' })
  async addLine(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateApuLineDto,
  ) {
    return Ok(
      await this.estimating.addApuLine(requireCompany(companyId), id, dto),
      'Insumo agregado',
    );
  }

  @Post('apus/import')
  @RequirePermissions(Permissions.ESTIMATING.CREATE)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @Audit({ entityType: 'Estimating' })
  @ApiOperation({ summary: 'Importar APUs desde CSV/XLSX' })
  async importApus(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: ImportApusDto,
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
  ) {
    if (!file?.buffer) throw new BadRequestException('Adjunta un archivo .csv o .xlsx');
    const matrix = await parseTabularMatrix(file);
    const records = mapRecords(matrix, APU_IMPORT_ALIASES, ['apu_code']);
    return Ok(
      await this.estimating.importApus(requireCompany(companyId), userId, dto.baseId, records),
      'Importación procesada',
    );
  }

  @Patch('apu-lines/:lineId')
  @RequirePermissions(Permissions.ESTIMATING.UPDATE)
  @Audit({ entityType: 'Estimating', idParam: 'lineId' })
  @ApiOperation({ summary: 'Actualizar insumo del APU' })
  async updateLine(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Body() dto: UpdateApuLineDto,
  ) {
    return Ok(
      await this.estimating.updateApuLine(requireCompany(companyId), lineId, dto),
      'Insumo actualizado',
    );
  }

  @Delete('apu-lines/:lineId')
  @RequirePermissions(Permissions.ESTIMATING.DELETE)
  @Audit({ entityType: 'Estimating', idParam: 'lineId' })
  @ApiOperation({ summary: 'Eliminar insumo del APU' })
  async deleteLine(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('lineId', ParseUUIDPipe) lineId: string,
  ) {
    await this.estimating.deleteApuLine(requireCompany(companyId), lineId);
    return Ok(undefined, 'Insumo eliminado');
  }
}

function requireCompany(companyId: string | undefined): string {
  if (!companyId) throw new BadRequestException('Falta el header x-company-id');
  return companyId;
}
