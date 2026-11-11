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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TakeoffService } from './takeoff.service.js';
import {
  CreateTakeoffLineDto,
  CreateTakeoffSheetDto,
  UpdateTakeoffLineDto,
  UpdateTakeoffSheetDto,
} from './dto/takeoff.dto.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { Permissions } from '../common/constants/permissions.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

@ApiTags('Takeoff - Memoria de cantidades')
@ApiBearerAuth()
@Controller('api')
@UseGuards(PermissionsGuard)
@ApiHeader({ name: 'x-company-id', required: true })
export class TakeoffController {
  constructor(private readonly takeoff: TakeoffService) {}

  @Get('projects/:projectId/takeoff')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_READ)
  @ApiOperation({ summary: 'Hojas de takeoff del proyecto' })
  async list(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return Ok(await this.takeoff.listSheets(requireCompany(companyId), projectId));
  }

  @Post('projects/:projectId/takeoff')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear hoja de takeoff' })
  async create(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTakeoffSheetDto,
  ) {
    return Ok(
      await this.takeoff.createSheet(requireCompany(companyId), userId, projectId, dto),
      'Hoja creada',
    );
  }

  @Get('takeoff/sheets/:id')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_READ)
  @ApiOperation({ summary: 'Detalle de hoja de takeoff con líneas' })
  async get(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(await this.takeoff.getSheet(requireCompany(companyId), id));
  }

  @Patch('takeoff/sheets/:id')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar hoja de takeoff' })
  async update(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTakeoffSheetDto,
  ) {
    return Ok(
      await this.takeoff.updateSheet(requireCompany(companyId), id, dto),
      'Hoja actualizada',
    );
  }

  @Delete('takeoff/sheets/:id')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar hoja de takeoff' })
  async remove(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.takeoff.deleteSheet(requireCompany(companyId), id);
    return Ok(undefined, 'Hoja eliminada');
  }

  @Post('takeoff/sheets/:id/apply')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Aplicar cantidad total a la actividad del presupuesto' })
  async apply(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(
      await this.takeoff.applyToBudgetItem(requireCompany(companyId), id),
      'Cantidad aplicada al presupuesto',
    );
  }

  @Post('takeoff/sheets/:id/lines')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Agregar línea de takeoff' })
  async addLine(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTakeoffLineDto,
  ) {
    return Ok(
      await this.takeoff.addLine(requireCompany(companyId), id, dto),
      'Línea agregada',
    );
  }

  @Patch('takeoff/lines/:lineId')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'lineId' })
  @ApiOperation({ summary: 'Actualizar línea de takeoff' })
  async updateLine(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Body() dto: UpdateTakeoffLineDto,
  ) {
    return Ok(
      await this.takeoff.updateLine(requireCompany(companyId), lineId, dto),
      'Línea actualizada',
    );
  }

  @Delete('takeoff/lines/:lineId')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'lineId' })
  @ApiOperation({ summary: 'Eliminar línea de takeoff' })
  async deleteLine(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('lineId', ParseUUIDPipe) lineId: string,
  ) {
    return Ok(
      await this.takeoff.deleteLine(requireCompany(companyId), lineId),
      'Línea eliminada',
    );
  }
}

function requireCompany(companyId: string | undefined): string {
  if (!companyId) throw new BadRequestException('Falta el header x-company-id');
  return companyId;
}
