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
import { PartiesService } from './parties.service.js';
import {
  AddPartyRoleDto,
  CreatePartyAddressDto,
  CreatePartyContactDto,
  CreatePartyDto,
  PartyIdentityDto,
  PartyQueryDto,
  UpdatePartyAddressDto,
  UpdatePartyContactDto,
  UpdatePartyDto,
} from './dto/party.dto.js';
import { Ok, OkPaged } from '../common/dto/api-response.dto.js';
import { Permissions } from '../common/constants/permissions.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';
import { PARTY_ROLES, type PartyRole } from './parties.types.js';

@ApiTags('Parties - Terceros')
@ApiBearerAuth()
@Controller('api/parties')
@UseGuards(PermissionsGuard)
@ApiHeader({ name: 'x-company-id', required: true })
export class PartiesController {
  constructor(private readonly parties: PartiesService) {}

  @Get()
  @RequirePermissions(Permissions.PARTIES.READ)
  @ApiOperation({ summary: 'Listar personas y organizaciones' })
  async list(
    @Headers('x-company-id') companyId: string | undefined,
    @Query() query: PartyQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const result = await this.parties.list(requireCompany(companyId), {
      search: query.search?.trim() || undefined,
      partyType: query.partyType,
      role: query.role,
      status: query.status,
      page,
      limit,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    });
    return OkPaged(result.data, result.total, page, limit);
  }

  @Post()
  @RequirePermissions(Permissions.PARTIES.CREATE)
  @Audit({ entityType: 'Party', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear una persona u organización' })
  async create(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: CreatePartyDto,
  ) {
    return Ok(
      await this.parties.create(requireCompany(companyId), userId, {
        partyType: dto.partyType,
        name: dto.name,
        legalName: dto.legalName,
        taxId: dto.taxId,
        email: dto.email,
        phone: dto.phone,
        roles: dto.roles,
        identities: dto.identities,
      }),
      'Tercero creado',
    );
  }

  @Get(':id')
  @RequirePermissions(Permissions.PARTIES.READ)
  @ApiOperation({ summary: 'Detalle de un tercero' })
  async get(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(await this.parties.get(requireCompany(companyId), id));
  }

  @Patch(':id')
  @RequirePermissions(Permissions.PARTIES.UPDATE)
  @Audit({ entityType: 'Party', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar datos base de un tercero' })
  async update(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartyDto,
  ) {
    return Ok(
      await this.parties.update(requireCompany(companyId), userId, id, {
        partyType: dto.partyType,
        name: dto.name,
        legalName: dto.legalName,
        taxId: dto.taxId,
        email: dto.email,
        phone: dto.phone,
        status: dto.status,
      }),
      'Tercero actualizado',
    );
  }

  @Delete(':id')
  @RequirePermissions(Permissions.PARTIES.DELETE)
  @Audit({ entityType: 'Party', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar un tercero' })
  async remove(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.parties.delete(requireCompany(companyId), userId, id);
    return Ok(undefined, 'Tercero eliminado');
  }

  @Post(':id/roles')
  @RequirePermissions(Permissions.PARTIES.UPDATE)
  @Audit({ entityType: 'Party', idParam: 'id' })
  @ApiOperation({ summary: 'Agregar un rol a un tercero' })
  async addRole(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPartyRoleDto,
  ) {
    return Ok(
      { role: await this.parties.addRole(requireCompany(companyId), id, dto.role) },
      'Rol agregado',
    );
  }

  @Delete(':id/roles/:role')
  @RequirePermissions(Permissions.PARTIES.UPDATE)
  @Audit({ entityType: 'Party', idParam: 'id' })
  @ApiOperation({ summary: 'Quitar un rol a un tercero' })
  async removeRole(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('role') role: string,
  ) {
    await this.parties.removeRole(requireCompany(companyId), id, parseRole(role));
    return Ok(undefined, 'Rol eliminado');
  }

  @Post(':id/identities')
  @RequirePermissions(Permissions.PARTIES.UPDATE)
  @Audit({ entityType: 'Party', idParam: 'id' })
  @ApiOperation({ summary: 'Agregar una identidad de canal' })
  async addIdentity(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PartyIdentityDto,
  ) {
    return Ok(
      await this.parties.addIdentity(requireCompany(companyId), id, dto),
      'Identidad agregada',
    );
  }

  @Delete(':id/identities/:identityId')
  @RequirePermissions(Permissions.PARTIES.UPDATE)
  @Audit({ entityType: 'Party', idParam: 'id' })
  @ApiOperation({ summary: 'Quitar una identidad de canal' })
  async removeIdentity(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('identityId', ParseUUIDPipe) identityId: string,
  ) {
    await this.parties.removeIdentity(requireCompany(companyId), id, identityId);
    return Ok(undefined, 'Identidad eliminada');
  }

  @Post(':id/contacts')
  @RequirePermissions(Permissions.PARTIES.UPDATE)
  @Audit({ entityType: 'Party', idParam: 'id' })
  @ApiOperation({ summary: 'Agregar un contacto' })
  async addContact(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePartyContactDto,
  ) {
    return Ok(
      await this.parties.addContact(requireCompany(companyId), id, dto),
      'Contacto agregado',
    );
  }

  @Patch(':id/contacts/:contactId')
  @RequirePermissions(Permissions.PARTIES.UPDATE)
  @Audit({ entityType: 'Party', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar un contacto' })
  async updateContact(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdatePartyContactDto,
  ) {
    return Ok(
      await this.parties.updateContact(requireCompany(companyId), id, contactId, dto),
      'Contacto actualizado',
    );
  }

  @Delete(':id/contacts/:contactId')
  @RequirePermissions(Permissions.PARTIES.UPDATE)
  @Audit({ entityType: 'Party', idParam: 'id' })
  @ApiOperation({ summary: 'Quitar un contacto' })
  async removeContact(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    await this.parties.removeContact(requireCompany(companyId), id, contactId);
    return Ok(undefined, 'Contacto eliminado');
  }

  @Post(':id/addresses')
  @RequirePermissions(Permissions.PARTIES.UPDATE)
  @Audit({ entityType: 'Party', idParam: 'id' })
  @ApiOperation({ summary: 'Agregar una dirección' })
  async addAddress(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePartyAddressDto,
  ) {
    return Ok(
      await this.parties.addAddress(requireCompany(companyId), id, dto),
      'Dirección agregada',
    );
  }

  @Patch(':id/addresses/:addressId')
  @RequirePermissions(Permissions.PARTIES.UPDATE)
  @Audit({ entityType: 'Party', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar una dirección' })
  async updateAddress(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdatePartyAddressDto,
  ) {
    return Ok(
      await this.parties.updateAddress(requireCompany(companyId), id, addressId, dto),
      'Dirección actualizada',
    );
  }

  @Delete(':id/addresses/:addressId')
  @RequirePermissions(Permissions.PARTIES.UPDATE)
  @Audit({ entityType: 'Party', idParam: 'id' })
  @ApiOperation({ summary: 'Quitar una dirección' })
  async removeAddress(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    await this.parties.removeAddress(requireCompany(companyId), id, addressId);
    return Ok(undefined, 'Dirección eliminada');
  }
}

function requireCompany(companyId: string | undefined): string {
  if (!companyId) throw new BadRequestException('Falta el header x-company-id');
  return companyId;
}

function parseRole(role: string): PartyRole {
  if (!PARTY_ROLES.includes(role as PartyRole)) {
    throw new BadRequestException('Rol de tercero inválido');
  }
  return role as PartyRole;
}
