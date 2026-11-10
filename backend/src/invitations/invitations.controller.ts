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
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

@ApiTags('Invitations - Administración')
@ApiBearerAuth()
@Controller('api/companies/users/invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:create')
  @Audit({ entityType: 'Member', resolveCreatedId: (r) => r?.data?.id })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiOperation({
    summary: 'Invitar a un usuario por email',
    description: 'Crea una invitación con token y envía el enlace por correo. No revela si el email ya existe.',
  })
  @ApiResponse({ status: 201, description: 'Invitación creada' })
  @ApiResponse({ status: 400, description: 'Email o roles inválidos' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  async create(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: CreateInvitationDto,
  ) {
    if (!companyId) {
      throw new BadRequestException('Falta el header x-company-id');
    }
    const result = await this.invitationsService.create(companyId, userId, dto);
    return Ok(
      result,
      result.emailSent
        ? 'Invitación enviada'
        : 'Invitación creada, pero no se pudo enviar el correo',
    );
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:read')
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiOperation({ summary: 'Listar invitaciones pendientes de la empresa' })
  @ApiResponse({ status: 200, description: 'Invitaciones pendientes' })
  async list(@Headers('x-company-id') companyId: string | undefined) {
    if (!companyId) {
      throw new BadRequestException('Falta el header x-company-id');
    }
    return Ok(await this.invitationsService.list(companyId));
  }

  @Delete(':invitationId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users:create')
  @Audit({ entityType: 'Member', idParam: 'invitationId', skipDiff: true })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiParam({ name: 'invitationId', description: 'UUID de la invitación' })
  @ApiOperation({ summary: 'Revocar una invitación pendiente' })
  @ApiResponse({ status: 200, description: 'Invitación revocada' })
  @ApiResponse({ status: 404, description: 'Invitación no encontrada' })
  async revoke(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ) {
    if (!companyId) {
      throw new BadRequestException('Falta el header x-company-id');
    }
    await this.invitationsService.revoke(companyId, invitationId);
    return Ok(undefined, 'Invitación revocada');
  }
}
