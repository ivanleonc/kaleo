import { Controller, Get, Post, Patch, Delete, Body, Param, Headers, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { MemberQueryDto, normalizePagination } from '../common/dto/pagination-query.dto.js';
import { Ok, OkPaged } from '../common/dto/api-response.dto.js';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { MemberService } from './member.service.js';
import { AddMemberDto } from './dto/add-member.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

@ApiTags('Members - Gestión de Miembros')
@ApiBearerAuth()
@Controller('api/companies/users')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Obtener miembros de la empresa', description: 'Requiere permiso users:read. Header x-company-id requerido.' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiResponse({
    status: 200,
    description: 'Lista de miembros con sus roles',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid',
            name: 'Juan Pérez',
            email: 'juan@empresa.com',
            status: 'active',
            must_change_password: false,
            roles: [{ id: 'role-uuid', name: 'Admin' }],
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  async getMembers(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string,
    @Query() query: MemberQueryDto,
  ) {
    const { page, limit } = normalizePagination(query);
    const result = await this.memberService.getMembers(companyId, page, limit, {
      search: query.search,
      status: query.status,
      roleId: query.roleId,
    });
    return OkPaged(result.data, result.total, result.page, result.limit);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:create')
  @Audit({ entityType: 'Member', resolveCreatedId: (r) => r?.data?.id })
  @ApiOperation({ summary: 'Agregar un miembro a la empresa', description: 'Si el email no existe, crea el usuario con contraseña temporal (must_change_password=true). Si ya existe, solo lo agrega a la empresa.' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiResponse({
    status: 201,
    description: 'Miembro agregado',
    schema: {
      example: {
        success: true,
        message: 'Miembro agregado exitosamente. Se generó una contraseña temporal.',
        data: {
          id: 'uuid',
          name: 'Juan Pérez',
          email: 'juan@empresa.com',
          temporary_password: 'xK9mN2pQ7rS',
          role_assigned: ['Editor'],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o usuario no encontrado' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  @ApiResponse({ status: 409, description: 'El usuario ya es miembro de la empresa' })
  async addMember(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: AddMemberDto,
  ) {
    const result = await this.memberService.addMember(
      companyId,
      dto.email,
      dto.name,
      dto.roleIds || [],
      {
        phone: dto.phone,
        position: dto.position,
        document_type: dto.document_type,
        document_number: dto.document_number,
      },
    );
    return Ok(
      {
        id: result.id,
        name: result.name,
        email: result.email,
        temporary_password: result.temporary_password,
        role_assigned: result.role_assigned,
      },
      result.isNewUser
        ? 'Miembro agregado exitosamente. Se generó una contraseña temporal.'
        : 'Miembro existente agregado a la empresa.',
    );
  }

  @Patch(':userId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:update')
  @Audit({ entityType: 'Member', idParam: 'userId' })
  @ApiOperation({ summary: 'Actualizar rol o estado de un miembro', description: 'Requiere permiso users:update. El userId debe ser un UUID válido.' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiParam({ name: 'userId', description: 'UUID del usuario', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'Miembro actualizado' })
  @ApiResponse({ status: 400, description: 'userId no es un UUID válido' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  @ApiResponse({ status: 404, description: 'Miembro no encontrado' })
  async updateMember(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    const result = await this.memberService.updateMember(companyId, targetUserId, {
      roleIds: dto.roleIds,
      status: dto.status,
      phone: dto.phone,
      position: dto.position,
      document_type: dto.document_type,
      document_number: dto.document_number,
    });
    return Ok(undefined, result.message);
  }

  @Post(':userId/reset-password')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:update')
  @Audit({ entityType: 'Member', idParam: 'userId', skipDiff: true })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetear contraseña de un miembro', description: 'Genera una nueva contraseña temporal. Requiere permiso users:update. El userId debe ser un UUID válido.' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiParam({ name: 'userId', description: 'UUID del usuario', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({
    status: 200,
    description: 'Contraseña reseteada',
    schema: {
      example: {
        success: true,
        message: 'Contraseña reseteada exitosamente.',
        data: {
          temporary_password: 'xK9mN2pQ7rS',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'userId no es un UUID válido' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  @ApiResponse({ status: 404, description: 'Miembro no encontrado' })
  async resetPassword(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    const result = await this.memberService.resetPassword(userId, companyId, targetUserId);
    return Ok(result, 'Contraseña reseteada exitosamente.');
  }

  @Post(':userId/reset-password-email')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:update')
  @Audit({ entityType: 'Member', idParam: 'userId', skipDiff: true })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetear contraseña y enviar al correo del miembro', description: 'Genera una contraseña temporal y la envía al email del usuario. Requiere permiso users:update.' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiParam({ name: 'userId', description: 'UUID del usuario', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({
    status: 200,
    description: 'Contraseña reseteada y enviada por email',
    schema: {
      example: {
        success: true,
        message: 'Contraseña reseteada y enviada a juan@empresa.com',
        data: {
          email: 'juan@empresa.com',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'userId no es un UUID válido' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  @ApiResponse({ status: 404, description: 'Miembro no encontrado' })
  async resetPasswordAndSendEmail(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    const result = await this.memberService.resetPasswordAndSendEmail(userId, companyId, targetUserId);
    return Ok(result, `Contraseña reseteada y enviada a ${result.email}`);
  }

  @Delete(':userId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:delete')
  @Audit({ entityType: 'Member', idParam: 'userId' })
  @ApiOperation({ summary: 'Eliminar un miembro de la empresa', description: 'Requiere permiso users:delete. El userId debe ser un UUID válido.' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiParam({ name: 'userId', description: 'UUID del usuario', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'Miembro eliminado' })
  @ApiResponse({ status: 400, description: 'userId no es un UUID válido' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  @ApiResponse({ status: 404, description: 'Miembro no encontrado' })
  async removeMember(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    const result = await this.memberService.removeMember(companyId, targetUserId);
    return Ok(undefined, result.message);
  }
}
