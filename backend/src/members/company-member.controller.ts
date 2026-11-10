import { Controller, Post, Delete, Body, Param, Headers, UseGuards, ParseUUIDPipe, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { Ok } from '../common/dto/api-response.dto.js';
import { MemberService } from './member.service.js';
import { AttachMemberDto } from './dto/attach-member.dto.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

/**
 * Endpoints de miembros con empresa explícita en el path.
 *
 * Se mantienen separados de MemberController (montado en
 * `api/companies/users`) para que la URL pública sea la documentada:
 * `/api/companies/:id/members`. Si estos métodos vivieran en aquel
 * controller, Nest los publicaría como `/api/companies/users/:id/members`
 * y el frontend recibiría 404.
 */
@ApiTags('Members - Gestión de Miembros')
@ApiBearerAuth()
@Controller('api/companies')
export class CompanyMemberController {
  constructor(private readonly memberService: MemberService) {}

  @Post(':id/members')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('core.users.create')
  @Audit({ entityType: 'Member', resolveCreatedId: (r) => r?.data?.id })
  @ApiOperation({ summary: 'Asignar un usuario a una empresa explícita', description: 'Si el usuario existe (por userId o email) solo se vincula, sin tocar su contraseña. Si no existe, se crea con temporal por correo (requiere name). Los roles deben pertenecer a la empresa destino. Super-admin u Owner con core.users.create.' })
  @ApiParam({ name: 'id', description: 'UUID de la empresa destino' })
  @ApiHeader({ name: 'x-company-id', description: 'Debe coincidir con :id, salvo super-admin', required: true })
  @ApiResponse({ status: 201, description: 'Miembro asignado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o rol de otra empresa' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 409, description: 'El usuario ya es miembro de esta empresa' })
  async attachMember(
    @Headers('x-company-id') headerCompanyId: string,
    @Param('id', ParseUUIDPipe) targetCompanyId: string,
    @Body() dto: AttachMemberDto,
    @Req() req: any,
  ) {
    this.assertTargetCompany(headerCompanyId, targetCompanyId, req);
    const result = await this.memberService.attachMember(targetCompanyId, {
      userId: dto.userId,
      email: dto.email,
      name: dto.name,
      roleIds: dto.roleIds,
      roleNames: dto.roleNames,
      phone: dto.phone,
      position: dto.position,
    });
    return Ok(result, result.isNewUser
      ? 'Miembro agregado exitosamente. Se envió la contraseña temporal por correo.'
      : 'Miembro existente asignado a la empresa.');
  }

  @Delete(':id/members/:userId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('core.users.delete')
  @Audit({ entityType: 'Member', idParam: 'userId' })
  @ApiOperation({ summary: 'Quitar un miembro de una empresa explícita', description: 'Respeta la protección de último Owner. Super-admin u Owner con core.users.delete.' })
  @ApiParam({ name: 'id', description: 'UUID de la empresa destino' })
  @ApiParam({ name: 'userId', description: 'UUID del usuario' })
  @ApiHeader({ name: 'x-company-id', description: 'Debe coincidir con :id, salvo super-admin', required: true })
  @ApiResponse({ status: 200, description: 'Miembro desvinculado' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  @ApiResponse({ status: 404, description: 'Miembro no encontrado' })
  @ApiResponse({ status: 409, description: 'No se puede eliminar al único Owner' })
  async detachMember(
    @Headers('x-company-id') headerCompanyId: string,
    @Param('id', ParseUUIDPipe) targetCompanyId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Req() req: any,
  ) {
    this.assertTargetCompany(headerCompanyId, targetCompanyId, req);
    const result = await this.memberService.removeMember(targetCompanyId, targetUserId);
    return Ok(undefined, result.message);
  }

  /**
   * Los guards evalúan la empresa del header. En endpoints con empresa
   * explícita (`:id`) el header debe coincidir, salvo super-admin global
   * (flag que ponen CompanyAccessGuard/PermissionsGuard en `request`).
   */
  private assertTargetCompany(headerCompanyId: string | undefined, targetCompanyId: string, req: any): void {
    if (req?.isSuperAdmin === true) return;
    if (!headerCompanyId || headerCompanyId !== targetCompanyId) {
      throw new ForbiddenException('La empresa del encabezado no coincide con la empresa destino');
    }
  }
}
