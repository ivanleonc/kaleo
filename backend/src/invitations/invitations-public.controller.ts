import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service.js';
import { AcceptExistingInvitationDto, AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Invitations - Aceptación')
@Controller('api/auth/invitations')
export class InvitationsPublicController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get(':token')
  @ApiParam({ name: 'token', description: 'Token de la invitación' })
  @ApiOperation({ summary: 'Consultar una invitación por token' })
  @ApiResponse({ status: 200, description: 'Invitación válida' })
  @ApiResponse({ status: 404, description: 'Invitación inválida o expirada' })
  async preview(@Param('token') token: string) {
    return Ok(await this.invitationsService.preview(token));
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('accept')
  @ApiOperation({
    summary: 'Aceptar invitación creando la cuenta',
    description: 'Para emails sin cuenta. Si el email ya existe, devuelve 409 y hay que iniciar sesión.',
  })
  @ApiResponse({ status: 201, description: 'Invitación aceptada' })
  @ApiResponse({ status: 409, description: 'El email ya tiene cuenta: iniciar sesión' })
  async accept(@Body() dto: AcceptInvitationDto) {
    const result = await this.invitationsService.acceptNew(dto.token, dto.name, dto.password);
    return Ok(result, 'Invitación aceptada. Ya puedes iniciar sesión.');
  }

  @Post('accept-authenticated')
  @ApiOperation({
    summary: 'Aceptar invitación con una cuenta existente',
    description: 'Requiere JWT. El email de la cuenta debe coincidir con el de la invitación.',
  })
  @ApiResponse({ status: 201, description: 'Invitación aceptada' })
  @ApiResponse({ status: 403, description: 'La invitación no corresponde a la cuenta' })
  async acceptAuthenticated(
    @CurrentUser('id') userId: string,
    @Body() dto: AcceptExistingInvitationDto,
  ) {
    const result = await this.invitationsService.acceptExisting(dto.token, userId);
    return Ok(result, 'Invitación aceptada');
  }
}
