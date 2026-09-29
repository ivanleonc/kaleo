import { Injectable, NotFoundException } from '@nestjs/common';
import { MemberRepository } from './repositories/member.repository.js';
import { PasswordService } from '../auth/password.service.js';
import { RefreshTokenRepository } from '../auth/repositories/refresh-token.repository.js';
import { EmailService } from '../email/email.service.js';

const TEMP_PASSWORD_LENGTH = 12;

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
  ) {
    return this.memberRepository.getMembersByCompany(companyId, page, limit, filters);
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

    return {
      ...result,
      temporary_password: tempPassword,
    };
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

    const tempPassword = this.generateTempPassword();
    await this.passwordService.adminResetPassword(adminUserId, targetUserId, companyId, tempPassword);

    return { temporary_password: tempPassword };
  }

  async resetPasswordAndSendEmail(adminUserId: string, companyId: string, targetUserId: string) {
    const isMember = await this.memberRepository.isAlreadyMember(targetUserId, companyId);
    if (!isMember) {
      throw new NotFoundException('El usuario no es miembro de esta empresa');
    }

    const user = await this.memberRepository.findUserById(targetUserId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const tempPassword = this.generateTempPassword();
    await this.passwordService.adminResetPassword(adminUserId, targetUserId, companyId, tempPassword);
    await this.emailService.sendTemporaryPassword(user.email, tempPassword);

    return { email: user.email };
  }

  async removeMember(companyId: string, userId: string) {
    const result = await this.memberRepository.removeMember(companyId, userId);
    await this.refreshTokenRepository.revokeAllForUser(userId);
    return result;
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
