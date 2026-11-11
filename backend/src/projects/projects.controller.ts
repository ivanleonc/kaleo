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
import { ProjectsService } from './projects.service.js';
import {
  AddProjectMemberDto,
  CreateProjectDto,
  ProjectQueryDto,
  UpdateProjectDto,
  UpdateProjectMemberDto,
} from './dto/project.dto.js';
import { Ok, OkPaged } from '../common/dto/api-response.dto.js';
import { Permissions } from '../common/constants/permissions.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

@ApiTags('Projects - Proyectos')
@ApiBearerAuth()
@Controller('api/projects')
@UseGuards(PermissionsGuard)
@ApiHeader({ name: 'x-company-id', required: true })
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @RequirePermissions(Permissions.PROJECTS.READ)
  @ApiOperation({ summary: 'Listar proyectos' })
  async list(
    @Headers('x-company-id') companyId: string | undefined,
    @Query() query: ProjectQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const result = await this.projects.list(requireCompany(companyId), {
      search: query.search?.trim() || undefined,
      status: query.status,
      branchId: query.branchId,
      clientPartyId: query.clientPartyId,
      page,
      limit,
    });
    return OkPaged(result.data, result.total, page, limit);
  }

  @Post()
  @RequirePermissions(Permissions.PROJECTS.CREATE)
  @Audit({ entityType: 'Project', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear proyecto' })
  async create(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: CreateProjectDto,
  ) {
    return Ok(
      await this.projects.create(requireCompany(companyId), userId, {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        status: dto.status,
        branchId: dto.branchId,
        clientPartyId: dto.clientPartyId,
        currencyCode: dto.currencyCode.toUpperCase(),
        startDate: dto.startDate,
        endDate: dto.endDate,
        timezone: dto.timezone,
        address: dto.address,
      }),
      'Proyecto creado',
    );
  }

  @Get(':id')
  @RequirePermissions(Permissions.PROJECTS.READ)
  @ApiOperation({ summary: 'Detalle de un proyecto' })
  async get(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(await this.projects.get(requireCompany(companyId), id));
  }

  @Patch(':id')
  @RequirePermissions(Permissions.PROJECTS.UPDATE)
  @Audit({ entityType: 'Project', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar proyecto' })
  async update(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return Ok(
      await this.projects.update(requireCompany(companyId), userId, id, {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        status: dto.status,
        branchId: dto.branchId,
        clientPartyId: dto.clientPartyId,
        currencyCode: dto.currencyCode?.toUpperCase(),
        startDate: dto.startDate,
        endDate: dto.endDate,
        timezone: dto.timezone,
        address: dto.address,
      }),
      'Proyecto actualizado',
    );
  }

  @Delete(':id')
  @RequirePermissions(Permissions.PROJECTS.DELETE)
  @Audit({ entityType: 'Project', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar proyecto' })
  async remove(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.projects.delete(requireCompany(companyId), id);
    return Ok(undefined, 'Proyecto eliminado');
  }

  @Get(':id/members')
  @RequirePermissions(Permissions.PROJECTS.READ)
  @ApiOperation({ summary: 'Equipo del proyecto' })
  async members(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(await this.projects.listMembers(requireCompany(companyId), id));
  }

  @Post(':id/members')
  @RequirePermissions(Permissions.PROJECTS.UPDATE)
  @Audit({ entityType: 'Project', idParam: 'id' })
  @ApiOperation({ summary: 'Agregar miembro al proyecto' })
  async addMember(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return Ok(
      await this.projects.addMember(
        requireCompany(companyId),
        id,
        dto.userId,
        dto.projectRole,
      ),
      'Miembro agregado',
    );
  }

  @Patch(':id/members/:membershipId')
  @RequirePermissions(Permissions.PROJECTS.UPDATE)
  @Audit({ entityType: 'Project', idParam: 'id' })
  @ApiOperation({ summary: 'Cambiar rol de un miembro del proyecto' })
  async updateMember(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: UpdateProjectMemberDto,
  ) {
    return Ok(
      await this.projects.updateMemberRole(
        requireCompany(companyId),
        id,
        membershipId,
        dto.projectRole,
      ),
      'Rol actualizado',
    );
  }

  @Delete(':id/members/:membershipId')
  @RequirePermissions(Permissions.PROJECTS.UPDATE)
  @Audit({ entityType: 'Project', idParam: 'id' })
  @ApiOperation({ summary: 'Quitar miembro del proyecto' })
  async removeMember(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
  ) {
    await this.projects.removeMember(requireCompany(companyId), id, membershipId);
    return Ok(undefined, 'Miembro eliminado');
  }
}

function requireCompany(companyId: string | undefined): string {
  if (!companyId) throw new BadRequestException('Falta el header x-company-id');
  return companyId;
}
