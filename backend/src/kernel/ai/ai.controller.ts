import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Ok } from '../../common/dto/api-response.dto.js';
import { Permissions } from '../../common/constants/permissions.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { Audit } from '../../common/decorators/audit-context.decorator.js';
import { AiService } from './ai.service.js';
import { CreateAiRunDto } from './dto/create-ai-run.dto.js';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('api/ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('tools')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.AI.READ)
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Catálogo de herramientas de IA activas' })
  async tools() {
    return Ok(await this.ai.listTools());
  }

  @Post('runs')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.AI.RUN)
  @Audit({ entityType: 'AI', skipDiff: true })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Ejecutar una tool o crear una acción HITL' })
  async run(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: CreateAiRunDto,
  ) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    return Ok(await this.ai.createRun(companyId, userId, dto.toolCode, dto.input ?? {}));
  }

  @Get('runs/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.AI.READ)
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiParam({ name: 'id', description: 'UUID del run' })
  @ApiOperation({ summary: 'Estado de un run de IA' })
  async getRun(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    return Ok(await this.ai.getRun(companyId, id));
  }

  @Get('actions')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.AI.READ)
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Acciones de IA pendientes o históricas' })
  async actions(
    @Headers('x-company-id') companyId: string | undefined,
    @Query('status') status?: string,
  ) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    const allowed = ['pending', 'approved', 'rejected', 'executed', 'failed'] as const;
    if (status && !allowed.includes(status as (typeof allowed)[number])) {
      throw new BadRequestException('status inválido');
    }
    return Ok(
      await this.ai.listActions(
        companyId,
        status as (typeof allowed)[number] | undefined,
      ),
    );
  }

  @Post('actions/:id/approve')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.AI.APPROVE)
  @Audit({ entityType: 'AI', idParam: 'id', skipDiff: true })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiParam({ name: 'id', description: 'UUID de la acción' })
  @ApiOperation({ summary: 'Aprobar y ejecutar una acción HITL' })
  async approve(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    return Ok(await this.ai.approveAction(companyId, id, userId), 'Acción aprobada y ejecutada');
  }

  @Post('actions/:id/reject')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.AI.APPROVE)
  @Audit({ entityType: 'AI', idParam: 'id', skipDiff: true })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiParam({ name: 'id', description: 'UUID de la acción' })
  @ApiOperation({ summary: 'Rechazar una acción HITL' })
  async reject(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (!companyId) throw new BadRequestException('Falta el header x-company-id');
    return Ok(await this.ai.rejectAction(companyId, id, userId), 'Acción rechazada');
  }
}
