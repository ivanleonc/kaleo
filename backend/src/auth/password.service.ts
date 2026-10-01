import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
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

/**
 * Operaciones de contraseña.
 *
 * Cada mutación que cambia la clave se ejecuta en una sola transacción de BD:
 *   1. updatePassword / updateTemporaryPassword
 *   2. INSERT password_history
 *   3. DELETE password_history antiguo (> 10 entradas)
 *   4. UPDATE refresh_tokens SET revoked = TRUE (donde aplica)
 *   5. UPDATE users SET must_change_password (donde aplica)
 *
 * Si cualquier paso falla el runner hace rollback, dejando los datos
 * exactamente como estaban. El audit log se escribe después del commit
 * (no bloquea ni revierte la operación, pero garantiza que solo se registra
 * si la mutación fue exitosa).
 */
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
    private dataSource: DataSource,
  ) {}

  private get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET')!;
  }

  // ---------------------------------------------------------------------------
  // Cambio de contraseña temporal (primer acceso forzado)
  // ---------------------------------------------------------------------------
  async changeTemporaryPassword(userId: string, newPasswordPlain: string) {
    validatePasswordStrength(newPasswordPlain);
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    await this.checkPasswordHistory(userId, newPasswordPlain);

    await this.runInTransaction(async (runner) => {
      const newHash = await bcrypt.hash(newPasswordPlain, SALT_ROUNDS);
      await runner.query(
        `UPDATE users SET password_hash = $1, must_change_password = FALSE, password_changed_at = NOW() WHERE id = $2`,
        [newHash, userId],
      );
      await runner.query(
        `INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)`,
        [userId, newHash],
      );
      await this.cleanupHistoryInTx(runner, userId);
    });

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

  // ---------------------------------------------------------------------------
  // Cambio de contraseña voluntario
  // ---------------------------------------------------------------------------
  async changePassword(userId: string, currentPassword: string, newPasswordPlain: string) {
    validatePasswordStrength(newPasswordPlain);
    const user = await this.userRepository.findByEmail(
      (await this.userRepository.findById(userId))?.email,
    );
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) throw new UnauthorizedException('La contraseña actual es incorrecta');

    await this.checkPasswordHistory(userId, newPasswordPlain);

    await this.runInTransaction(async (runner) => {
      const newHash = await bcrypt.hash(newPasswordPlain, SALT_ROUNDS);
      await runner.query(
        `UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2`,
        [newHash, userId],
      );
      await runner.query(
        `INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)`,
        [userId, newHash],
      );
      await this.cleanupHistoryInTx(runner, userId);
    });

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

  // ---------------------------------------------------------------------------
  // Solicitud de recuperación (envía email con JWT de un solo uso)
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Confirmación del link de recuperación
  // ---------------------------------------------------------------------------
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

    await this.runInTransaction(async (runner) => {
      const newHash = await bcrypt.hash(newPasswordPlain, SALT_ROUNDS);
      await runner.query(
        `UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2`,
        [newHash, user.id],
      );
      await runner.query(
        `INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)`,
        [user.id, newHash],
      );
      await this.cleanupHistoryInTx(runner, user.id);
      // Invalida todas las sesiones activas al recuperar desde link externo.
      await runner.query(
        `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
        [user.id],
      );
    });

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

  // ---------------------------------------------------------------------------
  // Reset administrativo (admin → usuario)
  // ---------------------------------------------------------------------------
  async adminResetPassword(
    adminUserId: string,
    targetUserId: string,
    companyId: string,
    tempPasswordPlain: string,
  ) {
    validatePasswordStrength(tempPasswordPlain);
    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) throw new UnauthorizedException('Usuario no encontrado');

    await this.checkPasswordHistory(targetUserId, tempPasswordPlain);

    await this.runInTransaction(async (runner) => {
      const newHash = await bcrypt.hash(tempPasswordPlain, SALT_ROUNDS);
      await runner.query(
        `UPDATE users SET password_hash = $1, must_change_password = TRUE, password_changed_at = NOW() WHERE id = $2`,
        [newHash, targetUserId],
      );
      await runner.query(
        `INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)`,
        [targetUserId, newHash],
      );
      await this.cleanupHistoryInTx(runner, targetUserId);
      // Cierra todas las sesiones del usuario afectado.
      await runner.query(
        `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
        [targetUserId],
      );
    });

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

  // ---------------------------------------------------------------------------
  // Helpers internos
  // ---------------------------------------------------------------------------

  /**
   * Verifica que la contraseña en claro no coincida con ninguna de las últimas
   * PASSWORD_HISTORY_LIMIT contraseñas guardadas como hash.
   * Recibe la contraseña en CLARO (antes de hashear) para que bcrypt.compare
   * pueda comparar correctamente contra los hashes almacenados.
   */
  private async checkPasswordHistory(userId: string, newPasswordPlain: string): Promise<void> {
    const recentHashes = await this.passwordHistoryRepository.getRecent(userId, PASSWORD_HISTORY_LIMIT);
    for (const oldHash of recentHashes) {
      if (await bcrypt.compare(newPasswordPlain, oldHash)) {
        throw new ForbiddenException(`No puedes usar una de las últimas ${PASSWORD_HISTORY_LIMIT} contraseñas.`);
      }
    }
  }

  /** Limpia historial antiguo dentro de una transacción activa. */
  private async cleanupHistoryInTx(runner: any, userId: string, keep = 10): Promise<void> {
    await runner.query(
      `DELETE FROM password_history
       WHERE user_id = $1
         AND id NOT IN (
           SELECT id FROM password_history
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT $2
         )`,
      [userId, keep],
    );
  }

  /** Ejecuta un bloque dentro de una transacción; hace rollback ante cualquier error. */
  private async runInTransaction(fn: (runner: any) => Promise<void>): Promise<void> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await fn(runner);
      await runner.commitTransaction();
    } catch (err) {
      await runner.rollbackTransaction();
      throw err;
    } finally {
      await runner.release();
    }
  }

  private async getFirstCompanyId(userId: string): Promise<string | undefined> {
    const tenants = await this.companyService.getUserCompanies(userId);
    return tenants[0]?.id;
  }
}
