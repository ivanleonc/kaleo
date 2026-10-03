import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { MemberRepository } from './repositories/member.repository.js';
import type { SortSpec } from '../common/dto/pagination-query.dto.js';
import { PasswordService } from '../auth/password.service.js';
import { RefreshTokenRepository } from '../auth/repositories/refresh-token.repository.js';
import { EmailService } from '../email/email.service.js';

@Injectable()
export class MemberService {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly passwordService: PasswordService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly emailService: EmailService,
  ) {}

  async getMembers(
    companyId: string,
    page = 1,
    limit = 50,
    filters: { search?: string; status?: string; roleId?: string } = {},
    sort: SortSpec = {},
  ) {
    return this.memberRepository.getMembersByCompany(companyId, page, limit, filters, sort);
  }

  async addMember(
    companyId: string,
    email: string,
    name: string,
    roleIds: string[],
    extra?: { phone?: string; position?: string; document_type?: string; document_number?: string },
  ) {
    const tempPassword = this.generateTempPassword();
    const passwordHash = await this.passwordService.hashPassword(tempPassword);
    const result = await this.memberRepository.addMember(companyId, email, name, roleIds, passwordHash, extra);

    // La contraseña temporal se envía por correo (nunca en el JSON de respuesta).
    // Si el envío falla el error llega al cliente como 500 — la BD YA fue
    // commiteada (el miembro existe), así que el admin puede reintentar el
    // reseteo manual o volver a invitar.
    await this.emailService.sendTemporaryPassword(email, tempPassword);

    return result;
  }

  async updateMember(
    companyId: string,
    userId: string,
    data: {
      roleIds?: string[];
      status?: string;
      phone?: string;
      position?: string;
      document_type?: string;
      document_number?: string;
    },
  ) {
    const result = await this.memberRepository.updateMember(companyId, userId, data);
    if (data.status === 'inactive') {
      await this.refreshTokenRepository.revokeAllForUser(userId);
    }
    return result;
  }

  async resetPassword(adminUserId: string, companyId: string, targetUserId: string) {
    const isMember = await this.memberRepository.isAlreadyMember(targetUserId, companyId);
    if (!isMember) {
      throw new NotFoundException('El usuario no es miembro de esta empresa');
    }

    const user = await this.memberRepository.findUserById(targetUserId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const tempPassword = this.generateTempPassword();
    await this.passwordService.adminResetPassword(adminUserId, targetUserId, companyId, tempPassword);
    // Siempre envía por correo: nunca se devuelve la clave en el JSON.
    await this.emailService.sendTemporaryPassword(user.email, tempPassword);

    return { email: user.email };
  }

  async resetPasswordAndSendEmail(adminUserId: string, companyId: string, targetUserId: string) {
    // Alias mantenido por compatibilidad con el controlador existente.
    return this.resetPassword(adminUserId, companyId, targetUserId);
  }

  async removeMember(companyId: string, userId: string) {
    const result = await this.memberRepository.removeMember(companyId, userId);
    await this.refreshTokenRepository.revokeAllForUser(userId);
    return result;
  }

  /**
   * Asigna un usuario a una empresa explícita (`:id` del path, no del header).
   *
   * - Si se pasa `userId`: el usuario debe existir; solo se vincula (sin
   *   tocar su contraseña ni enviarle correos: su acceso actual no cambia).
   * - Si solo se pasa `email` y no existe: se crea como en addMember
   *   (contraseña temporal por correo).
   * - Si solo se pasa `email` y existe: se vincula sin efectos colaterales.
   * - Roles: se aceptan `roleIds` (validados contra la empresa destino) o
   *   `roleNames` (resueltos dentro de la empresa destino; útil para asignar
   *   el mismo rol en varias empresas con IDs distintos).
   */
  async attachMember(
    targetCompanyId: string,
    input: { userId?: string; email?: string; name?: string; roleIds?: string[]; roleNames?: string[]; phone?: string; position?: string },
  ) {
    let roleIds = input.roleIds ?? [];
    if (roleIds.length === 0 && input.roleNames?.length) {
      const resolved = await this.memberRepository.resolveRoleIdsByName(input.roleNames, targetCompanyId);
      if (resolved.missing.length > 0) {
        throw new BadRequestException(
          `Roles no encontrados en esta empresa: ${resolved.missing.join(', ')}`,
        );
      }
      roleIds = resolved.ids;
    }
    if (roleIds.length === 0) {
      throw new BadRequestException('Debes asignar al menos un rol');
    }
    const invalid = await this.memberRepository.findInvalidRoleIds(roleIds, targetCompanyId);
    if (invalid.length > 0) {
      throw new BadRequestException('Uno o más roles no pertenecen a esta empresa');
    }

    if (input.userId) {
      const user = await this.memberRepository.findUserById(input.userId);
      if (!user) throw new NotFoundException('Usuario no encontrado');
      const attached = await this.memberRepository.attachExistingUser(targetCompanyId, user.id, roleIds);
      return { ...attached, name: user.name, email: user.email };
    }

    if (!input.email) {
      throw new BadRequestException('Debes indicar userId o email');
    }
    const email: string = input.email;
    const existing = await this.memberRepository.findUserByEmail(email);
    if (existing) {
      const attached = await this.memberRepository.attachExistingUser(targetCompanyId, existing.id, roleIds);
      return { ...attached, name: existing.name, email: existing.email };
    }

    if (!input.name?.trim()) {
      throw new BadRequestException('El nombre es requerido para crear un usuario nuevo');
    }
    // Usuario nuevo: mismo flujo que addMember (temporal por correo).
    return this.addMember(targetCompanyId, email, input.name.trim(), roleIds, {
      phone: input.phone,
      position: input.position,
    });
  }

  /** Empresas (con roles) a las que pertenece un miembro. */
  async getUserCompanies(targetUserId: string) {
    const user = await this.memberRepository.findUserById(targetUserId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.memberRepository.getMemberCompanies(targetUserId);
  }

  /** Búsqueda de usuarios para autocompletar (solo id/nombre/email). */
  async searchUsers(query: string) {
    const q = (query ?? '').trim();
    if (q.length < 2) {
      throw new BadRequestException('La búsqueda requiere al menos 2 caracteres');
    }
    return this.memberRepository.searchUsers(q);
  }

  private generateTempPassword(): string {
    // randomBytes(8) gives 16 hex chars (lowercase + digits), append 'Ax' for uppercase + guaranteed mix
    return randomBytes(8).toString('hex') + 'Ax';
  }
}
