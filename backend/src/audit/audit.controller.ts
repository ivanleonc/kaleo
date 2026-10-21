import { Controller, Get, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service.js';
import { AuditQueryDto } from '../common/dto/audit-query.dto.js';
import { AuditExportQueryDto } from './dto/audit-export-query.dto.js';
import { Ok, OkCursor } from '../common/dto/api-response.dto.js';
import { exportFileToStreamable } from '../common/export/tabular-export.service.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Permissions } from '../common/constants/permissions.js';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@RequirePermissions(Permissions.AUDIT.READ)
@Controller('api/audit')
export class AuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Obtener logs de auditoria de la empresa (paginacion por cursor)' })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async getLogs(
    @Headers('x-company-id') companyId: string,
    @Query() query: AuditQueryDto,
  ) {
    const { limit, cursor, entityType, action, userId, from, to } = query;
    const result = await this.auditLogService.findFiltered({
      companyId,
      limit: limit ?? 20,
      cursor,
      entityType,
      action,
      userId,
      from,
      to,
    });
    return OkCursor(result.data, result.nextCursor, result.hasNext, result.limit);
  }

  @Get('logs/export')
  @ApiOperation({ summary: 'Exportar logs de auditoría como CSV o Excel' })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async exportLogs(
    @Headers('x-company-id') companyId: string,
    @Query() query: AuditExportQueryDto,
  ) {
    const file = await this.auditLogService.exportLogs({
      companyId,
      entityType: query.entityType,
      action: query.action,
      userId: query.userId,
      from: query.from,
      to: query.to,
      format: query.format ?? 'csv',
      columns: query.columns,
    });

    return exportFileToStreamable(file);
  }

  @Get('entity-types')
  @ApiOperation({ summary: 'Obtener tipos de entidad disponibles' })
  @ApiHeader({ name: 'x-company-id', required: true })
  async getEntityTypes(@Headers('x-company-id') companyId: string) {
    const types = await this.auditLogService.getEntityTypes(companyId);
    return Ok(types.map((t: any) => t.entity_type));
  }
}
