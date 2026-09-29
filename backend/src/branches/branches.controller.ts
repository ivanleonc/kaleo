import { Controller, Get, Post, Patch, Delete, Body, Param, Headers, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { BranchService } from './branches.service.js';
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

@ApiTags('Branches - Sedes')
@ApiBearerAuth()
@Controller('api/companies/branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('branches:read')
  @ApiOperation({ summary: 'Obtener sedes de la empresa', description: 'Retorna la lista de sedes. Requiere permiso branches:read.' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiResponse({ status: 200, description: 'Lista de sedes' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  async getBranches(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string,
  ) {
    const branches = await this.branchService.getBranches(companyId);
    return Ok(branches);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('branches:create')
  @Audit({ entityType: 'Branch', resolveCreatedId: (r) => r?.data?.id })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una sede', description: 'Crea una nueva sede para la empresa. Requiere permiso branches:create.' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiResponse({ status: 201, description: 'Sede creada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  async createBranch(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: CreateBranchDto,
  ) {
    const branch = await this.branchService.createBranch(companyId, dto);
    return Ok(branch, 'Sede creada exitosamente');
  }

  @Patch(':branchId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('branches:update')
  @Audit({ entityType: 'Branch', idParam: 'branchId' })
  @ApiOperation({ summary: 'Actualizar una sede', description: 'Actualiza información de la sede. Requiere permiso branches:update.' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiParam({ name: 'branchId', description: 'UUID de la sede', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'Sede actualizada' })
  @ApiResponse({ status: 400, description: 'branchId no es un UUID válido' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  @ApiResponse({ status: 404, description: 'Sede no encontrada' })
  async updateBranch(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: UpdateBranchDto,
  ) {
    const branch = await this.branchService.updateBranch(companyId, branchId, dto);
    return Ok(branch, 'Sede actualizada exitosamente');
  }

  @Delete(':branchId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('branches:delete')
  @Audit({ entityType: 'Branch', idParam: 'branchId' })
  @ApiOperation({ summary: 'Eliminar una sede', description: 'Soft delete de la sede. No se puede si tiene miembros asignados. Requiere permiso branches:delete.' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiParam({ name: 'branchId', description: 'UUID de la sede' })
  @ApiResponse({ status: 200, description: 'Sede eliminada' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  @ApiResponse({ status: 404, description: 'Sede no encontrada' })
  @ApiResponse({ status: 409, description: 'La sede tiene miembros asignados' })
  async deleteBranch(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
  ) {
    const result = await this.branchService.deleteBranch(companyId, branchId);
    return Ok(undefined, result.message);
  }
}
