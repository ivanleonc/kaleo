import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Ok } from '../../common/dto/api-response.dto.js';
import { Permissions } from '../../common/constants/permissions.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { Audit } from '../../common/decorators/audit-context.decorator.js';
import { OperationsService } from './operations.service.js';
import { ExportRequestDto, ReportRequestDto } from './dto/export-request.dto.js';
import { ImportBranchesDto } from './dto/import-branches.dto.js';
import type { OperationRow } from './operations.types.js';

@ApiTags('Operations')
@ApiBearerAuth()
@Controller('api/operations')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Post('exports/members')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.USERS.READ)
  @Audit({ entityType: 'Settings', skip: true })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Encolar exportación asíncrona de miembros' })
  async exportMembers(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: ExportRequestDto,
  ) {
    return this.enqueue(companyId, userId, 'members', dto);
  }

  @Post('exports/branches')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.BRANCHES.READ)
  @Audit({ entityType: 'Settings', skip: true })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Encolar exportación asíncrona de sedes' })
  async exportBranches(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: ExportRequestDto,
  ) {
    return this.enqueue(companyId, userId, 'branches', dto);
  }

  @Post('exports/analyses')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.ANALYSES.READ)
  @Audit({ entityType: 'Settings', skip: true })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Encolar exportación asíncrona de análisis' })
  async exportAnalyses(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: ExportRequestDto,
  ) {
    return this.enqueue(companyId, userId, 'analyses', dto);
  }

  @Post('exports/audit')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.AUDIT.READ)
  @Audit({ entityType: 'Settings', skip: true })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Encolar exportación asíncrona de auditoría' })
  async exportAudit(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: ExportRequestDto,
  ) {
    return this.enqueue(companyId, userId, 'audit', dto);
  }

  @Post('reports/analyses')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.ANALYSES.READ)
  @Audit({ entityType: 'Settings', skip: true })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Encolar reporte de análisis' })
  async reportAnalyses(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: ReportRequestDto,
  ) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    return Ok(
      stripData(await this.operations.requestAnalysesReport(companyId, userId, dto.format)),
      'Reporte encolado',
    );
  }

  @Post('imports/branches')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.BRANCHES.CREATE)
  @Audit({ entityType: 'Settings', skip: true })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Encolar importación de sedes desde JSON' })
  async importBranches(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: ImportBranchesDto,
  ) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    return Ok(
      stripData(
        await this.operations.requestBranchImport(
          companyId,
          userId,
          dto.rows as unknown as Record<string, unknown>[],
        ),
      ),
      'Importación encolada',
    );
  }

  @Get(':id')
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Estado de una operación asíncrona' })
  async get(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    return Ok(stripData(await this.operations.get(companyId, userId, id)));
  }

  @Get(':id/download')
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Descargar el archivo de una operación lista' })
  async download(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    const operation = await this.operations.get(companyId, userId, id);

    if (operation.status !== 'ready' || !operation.data) {
      throw new BadRequestException('La operación todavía no tiene un archivo disponible');
    }

    return new StreamableFile(operation.data, {
      type: operation.content_type ?? 'application/octet-stream',
      disposition: `attachment; filename="${operation.filename ?? 'export'}"`,
    });
  }

  private async enqueue(
    companyId: string | undefined,
    userId: string,
    resource: 'members' | 'branches' | 'analyses' | 'audit',
    dto: ExportRequestDto,
  ) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    const operation = await this.operations.requestExport(
      companyId,
      userId,
      resource,
      dto.format,
      {
        filters: dto.filters,
        columns: dto.columns,
        sortBy: dto.sortBy,
        sortDir: dto.sortDir,
      },
    );
    return Ok(stripData(operation), 'Exportación encolada');
  }
}

function stripData(operation: OperationRow) {
  const { data: _data, ...rest } = operation;
  return rest;
}
