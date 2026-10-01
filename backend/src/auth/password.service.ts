import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repositories/user.repository.js';
import { RefreshTokenRepository } from './repositories/refresh-token.repository.js';
import { PasswordHistoryRepository } from './repositories/password-history.repository.js';
import { AuditLogService } from '../audit/audit-log.service.js';
import { EmailService } from '../email/email.service.js';
import { CompanyService } from '../company/company.service.js';
import { validatePasswordStrength } from './utils/password-validator.js';

const SALT_ROUNDS = 10;
const PASSWORD_HISTORY_LIMIT = 3;

@Injectable()
export class PasswordService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
    private refreshTokenRepository: RefreshTokenRepository,
    private passwordHistoryRepository: PasswordHistoryRepository,
    private auditLogService: AuditLogService,
    private emailService: EmailService,
    private companyService: CompanyService,
  ) {}

  private get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET')!;
  }

  async changeTemporaryPassword(userId: string, newPasswordPlain: string) {
    validatePasswordStrength(newPasswordPlain);
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    await this.checkPasswordHistory(userId, newPasswordPlain);
    const newPasswordHash = await bcrypt.hash(newPasswordPlain, SALT_ROUNDS);
    await this.userRepository.updateTemporaryPassword(userId, newPasswordHash);
    await this.savePasswordHistory(userId, newPasswordHash);

    const companyId = await this.getFirstCompanyId(userId);
    if (companyId) {
      await this.auditLogService.log({
        userId,
        companyId,
        action: 'TEMPORARY_PASSWORD_CHANGED',
        entityType: 'User',
        entityId: userId,
      });
    }

    return { message: 'Contraseña actualizada correctamente. Ya puedes acceder al sistema.' };
  }

  async changePassword(userId: string, currentPassword: string, newPasswordPlain: string) {
    validatePasswordStrength(newPasswordPlain);
    const user = await this.userRepository.findByEmail(
      (await this.userRepository.findById(userId))?.email,
    );
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) throw new UnauthorizedException('La contraseña actual es incorrecta');

    await this.checkPasswordHistory(userId, newPasswordPlain);
    const newPasswordHash = await bcrypt.hash(newPasswordPlain, SALT_ROUNDS);
    await this.userRepository.updatePassword(userId, newPasswordHash);
    await this.savePasswordHistory(userId, newPasswordHash);

    const companyId = await this.getFirstCompanyId(userId);
    if (companyId) {
      await this.auditLogService.log({
        userId,
        companyId,
        action: 'PASSWORD_CHANGED',
        entityType: 'User',
        entityId: userId,
      });
    }

    return { message: 'Contraseña actualizada correctamente.' };
  }

  async requestPasswordReset(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return { message: 'Si el correo existe, se han enviado las instrucciones.' };
    }

    const tempSecret = this.jwtSecret + user.password_hash;
    const resetToken = this.jwtService.sign({ id: user.id }, { secret: tempSecret, expiresIn: '15m' });

    await this.emailService.sendPasswordReset(user.email, resetToken);

    const companyId = await this.getFirstCompanyId(user.id);
    if (companyId) {
      await this.auditLogService.log({
        userId: user.id,
        companyId,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id,
      });
    }

    return { message: 'Si el correo existe, se han enviado las instrucciones.' };
  }

  async resetPassword(email: string, token: string, newPasswordPlain: string) {
    validatePasswordStrength(newPasswordPlain);
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedException('Token inválido o expirado.');

    const tempSecret = this.jwtSecret + user.password_hash;
    try {
      const decoded = this.jwtService.verify(token, { secret: tempSecret });
      if (decoded.id !== user.id) throw new Error();
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    await this.checkPasswordHistory(user.id, newPasswordPlain);
    const newPasswordHash = await bcrypt.hash(newPasswordPlain, SALT_ROUNDS);
    await this.userRepository.updatePassword(user.id, newPasswordHash);
    await this.savePasswordHistory(user.id, newPasswordHash);
    await this.refreshTokenRepository.revokeAllForUser(user.id);

    const companyId = await this.getFirstCompanyId(user.id);
    if (companyId) {
      await this.auditLogService.log({
        userId: user.id,
        companyId,
        action: 'PASSWORD_RESET_COMPLETED',
        entityType: 'User',
        entityId: user.id,
      });
    }

    return { message: 'Contraseña recuperada y actualizada correctamente.' };
  }

  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  async adminResetPassword(adminUserId: string, targetUserId: string, companyId: string, tempPasswordPlain: string) {
    validatePasswordStrength(tempPasswordPlain);
    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) throw new UnauthorizedException('Usuario no encontrado');

    await this.checkPasswordHistory(targetUserId, tempPasswordPlain);
    const newHash = await bcrypt.hash(tempPasswordPlain, SALT_ROUNDS);
    await this.userRepository.updatePassword(targetUserId, newHash);
    await this.userRepository.setMustChangePassword(targetUserId, true);
    await this.savePasswordHistory(targetUserId, newHash);
    await this.refreshTokenRepository.revokeAllForUser(targetUserId);

    await this.auditLogService.log({
      userId: adminUserId,
      companyId,
      action: 'ADMIN_PASSWORD_RESET',
      entityType: 'User',
      entityId: targetUserId,
      newValues: { target_email: targetUser.email },
    });

    return { message: 'Contraseña reseteada exitosamente.' };
  }

  private async checkPasswordHistory(userId: string, newPasswordPlain: string): Promise<void> {
    const recentHashes = await this.passwordHistoryRepository.getRecent(userId, PASSWORD_HISTORY_LIMIT);
    for (const oldHash of recentHashes) {
      if (await bcrypt.compare(newPasswordPlain, oldHash)) {
        throw new ForbiddenException(`No puedes usar una de las últimas ${PASSWORD_HISTORY_LIMIT} contraseñas.`);
      }
    }
  }

  private async savePasswordHistory(userId: string, passwordHash: string) {
    await this.passwordHistoryRepository.add(userId, passwordHash);
    await this.passwordHistoryRepository.cleanup(userId);
  }

  private async getFirstCompanyId(userId: string): Promise<string | undefined> {
    const tenants = await this.companyService.getUserCompanies(userId);
    return tenants[0]?.id;
  }
}
