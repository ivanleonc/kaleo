import { Controller, Get, Post, Put, Delete, Body, Param, Headers, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { RbacService } from './rbac.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { SystemRoles } from '../common/constants/roles.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

@ApiTags('RBAC - Roles & Permissions')
@ApiBearerAuth()
@Controller('api')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('permissions')
  @UseGuards(RolesGuard)
  @Roles(SystemRoles.OWNER, SystemRoles.ADMIN, SystemRoles.VIEWER)
  @ApiOperation({ summary: 'Obtener catálogo maestro de permisos' })
  @ApiResponse({ status: 200, description: 'Lista de todos los permisos del sistema' })
  async getAllPermissions() {
    const permissions = await this.rbacService.getAllPermissions();
    return Ok(permissions);
  }

  @Get('roles')
  @UseGuards(RolesGuard)
  @Roles(SystemRoles.OWNER, SystemRoles.ADMIN, SystemRoles.VIEWER)
  @ApiOperation({ summary: 'Obtener roles con sus permisos' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa', required: true })
  @ApiResponse({ status: 200, description: 'Lista de roles con permisos anidados' })
  async getRoles(@Headers('x-company-id') companyId: string) {
    const roles = await this.rbacService.getRolesWithPermissions(companyId);
    return Ok(roles);
  }

  @Get('roles/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRoles.OWNER, SystemRoles.ADMIN, SystemRoles.VIEWER)
  @ApiOperation({ summary: 'Obtener un rol por ID con sus permisos', description: 'El id debe ser un UUID válido.' })
  @ApiParam({ name: 'id', description: 'UUID del rol', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa', required: true })
  @ApiResponse({ status: 200, description: 'Rol con permisos' })
  @ApiResponse({ status: 400, description: 'id no es un UUID válido' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  async getRoleById(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-company-id') companyId: string,
  ) {
    const role = await this.rbacService.getRoleById(id, companyId);
    return Ok(role);
  }

  @Post('roles')
  @UseGuards(RolesGuard)
  @Roles(SystemRoles.OWNER, SystemRoles.ADMIN)
  @Audit({ entityType: 'Role', resolveCreatedId: (r) => r?.data?.id })
  @ApiOperation({ summary: 'Crear un rol personalizado' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa (opcional)' })
  @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Ya existe un rol con ese nombre' })
  async createRole(
    @Body() dto: CreateRoleDto,
    @Headers('x-company-id') companyId: string,
  ) {
    const role = await this.rbacService.createRole(dto.name, dto.permissionIds || [], companyId, dto.description, dto.color);
    return Ok(role, 'Rol creado exitosamente');
  }

  @Put('roles/:id/permissions')
  @UseGuards(RolesGuard)
  @Roles(SystemRoles.OWNER)
  @Audit({ entityType: 'Role', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar permisos de un rol', description: 'Solo el Owner puede modificar permisos. El id debe ser un UUID válido.' })
  @ApiParam({ name: 'id', description: 'UUID del rol', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'Permisos actualizados' })
  @ApiResponse({ status: 400, description: 'id no es un UUID válido' })
  @ApiResponse({ status: 403, description: 'Solo el Owner puede modificar permisos' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  async updateRolePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @Headers('x-company-id') companyId: string,
  ) {
    const role = await this.rbacService.updateRolePermissions(id, dto.permissionIds || [], companyId);
    return Ok(role, 'Permisos actualizados correctamente');
  }

  @Put('roles/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRoles.OWNER, SystemRoles.ADMIN)
  @Audit({ entityType: 'Role', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar un rol (nombre y/o permisos)' })
  @ApiParam({ name: 'id', description: 'UUID del rol' })
  @ApiResponse({ status: 200, description: 'Rol actualizado' })
  @ApiResponse({ status: 400, description: 'id no es un UUID valido' })
  @ApiResponse({ status: 409, description: 'Nombre duplicado o rol del sistema' })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @Headers('x-company-id') companyId: string,
  ) {
    const role = await this.rbacService.updateRole(id, dto, companyId);
    return Ok(role, 'Rol actualizado correctamente');
  }

  @Delete('roles/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRoles.OWNER)
  @Audit({ entityType: 'Role', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar un rol personalizado', description: 'No se pueden eliminar Owner ni Admin. El id debe ser un UUID válido.' })
  @ApiParam({ name: 'id', description: 'UUID del rol', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'Rol eliminado' })
  @ApiResponse({ status: 400, description: 'id no es un UUID válido' })
  @ApiResponse({ status: 409, description: 'No se puede eliminar un rol del sistema' })
  async deleteRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-company-id') companyId: string,
  ) {
    const result = await this.rbacService.deleteRole(id, companyId);
    return Ok(undefined, result.message);
  }
}
