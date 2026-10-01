import { Controller, Get, Post, Body, Param, Put, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CompanyService } from './company.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('api/companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener empresas del usuario autenticado', description: 'Retorna la lista de empresas a las que pertenece el usuario, incluyendo sus roles (Owner, Admin, etc.)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de empresas del usuario',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'company-uuid-1',
            name: 'Mi Empresa S.A.',
            tax_id: '12345678-9',
            roles: ['Owner'],
          },
          {
            id: 'company-uuid-2',
            name: 'Otra Empresa Ltda.',
            tax_id: '98765432-1',
            roles: ['Admin'],
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token JWT inválido o expirado' })
  async getUserCompanies(@CurrentUser('id') userId: string) {
    const companies = await this.companyService.getUserCompanies(userId);
    return Ok(companies);
  }

  // NOTA: no usar '@Get(":id")' aquí: colisiona con las rutas exactas
  // /companies/users y /companies/branches (Express registra first-match-wins
  // según dependencias de módulos y ParseUUIDPipe devolvería 400).
  @Get(':id/detail')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('company:read')
  @ApiOperation({ summary: 'Obtener detalle de una empresa', description: 'Solo miembros de la empresa con permiso company:read. El id debe ser un UUID válido.' })
  @ApiParam({ name: 'id', description: 'UUID de la empresa' })
  @ApiResponse({ status: 200, description: 'Detalle de la empresa' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a esta empresa' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  async getCompany(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) companyId: string,
  ) {
    const company = await this.companyService.getCompanyDetail(userId, companyId);
    return Ok(company);
  }

  @Post()
  @Audit({ entityType: 'Company', resolveCreatedId: (r) => r?.data?.company?.id })
  @ApiOperation({ summary: 'Crear nueva empresa', description: 'El usuario autenticado se convierte automáticamente en Owner de la empresa creada' })
  @ApiResponse({
    status: 201,
    description: 'Empresa creada exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Empresa creada exitosamente',
        data: {
          company: {
            id: 'company-uuid-3',
            name: 'Nueva Empresa SpA',
            tax_id: '11223344-5',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos (nombre requerido, mínimo 2 caracteres)' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido o expirado' })
  async createCompany(
    @CurrentUser('id') userId: string,
    @Body() createCompanyDto: CreateCompanyDto,
  ) {
    const newCompany = await this.companyService.createCompany(
      userId,
      createCompanyDto.name,
      createCompanyDto.tax_id,
      createCompanyDto.slug,
    );
    return Ok({ company: newCompany }, 'Empresa creada exitosamente');
  }

  @Put(':id')
  @Audit({ entityType: 'Company', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar información de empresa', description: 'Solo el rol Owner puede modificar los datos de la empresa. El id debe ser un UUID válido.' })
  @ApiParam({ name: 'id', description: 'UUID de la empresa', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({
    status: 200,
    description: 'Empresa actualizada exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Empresa actualizada exitosamente',
        data: {
          company: {
            id: 'company-uuid-1',
            name: 'Mi Empresa S.A. (editada)',
            tax_id: '12345678-9',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'id no es un UUID válido o datos inválidos' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido o expirado' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a esta empresa o no eres Owner' })
  async updateCompany(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) companyId: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    const updatedCompany = await this.companyService.updateCompanyInfo(userId, companyId, updateCompanyDto);
    return Ok({ company: updatedCompany }, 'Empresa actualizada exitosamente');
  }
}
