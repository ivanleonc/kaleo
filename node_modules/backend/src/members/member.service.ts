import { Injectable, NotFoundException } from '@nestjs/common';
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

  private generateTempPassword(): string {
    // randomBytes(8) gives 16 hex chars (lowercase + digits), append 'Ax' for uppercase + guaranteed mix
    return randomBytes(8).toString('hex') + 'Ax';
  }
}
