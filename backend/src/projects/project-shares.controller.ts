import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectSharesService } from './project-shares.service.js';
import { CreateShareLinkDto } from './dto/project-share.dto.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { Permissions } from '../common/constants/permissions.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

@ApiTags('Projects - Enlaces compartidos')
@ApiBearerAuth()
@Controller('api/projects/:projectId/shares')
@UseGuards(PermissionsGuard)
@ApiHeader({ name: 'x-company-id', required: true })
export class ProjectSharesController {
  constructor(private readonly shares: ProjectSharesService) {}

  @Get()
  @RequirePermissions(Permissions.PROJECTS.SHARE)
  @ApiOperation({ summary: 'Enlaces compartidos del proyecto' })
  async list(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return Ok(await this.shares.list(requireCompany(companyId), projectId));
  }

  @Post()
  @RequirePermissions(Permissions.PROJECTS.SHARE)
  @Audit({ entityType: 'ProjectShare', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear enlace compartido (devuelve el token una vez)' })
  async create(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateShareLinkDto,
  ) {
    return Ok(
      await this.shares.create(requireCompany(companyId), userId, projectId, dto),
      'Enlace creado',
    );
  }

  @Delete(':id')
  @RequirePermissions(Permissions.PROJECTS.SHARE)
  @Audit({ entityType: 'ProjectShare', idParam: 'id' })
  @ApiOperation({ summary: 'Revocar enlace compartido' })
  async revoke(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.shares.revoke(requireCompany(companyId), projectId, id);
    return Ok(undefined, 'Enlace revocado');
  }
}

function requireCompany(companyId: string | undefined): string {
  if (!companyId) throw new BadRequestException('Falta el header x-company-id');
  return companyId;
}
