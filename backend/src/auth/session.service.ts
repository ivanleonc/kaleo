import { Injectable, UnauthorizedException, ForbiddenException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { EmailService } from '../email/email.service.js';
import { UserRepository } from './repositories/user.repository.js';
import { RefreshTokenRepository } from './repositories/refresh-token.repository.js';
import { TokenBlacklistRepository } from './repositories/token-blacklist.repository.js';
import { CompanyService } from '../company/company.service.js';
import { AuditLogService } from '../audit/audit-log.service.js';
import { RbacService } from '../rbac/rbac.service.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const PASSWORD_MAX_AGE_DAYS = 90;

@Injectable()
export class SessionService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
    private refreshTokenRepository: RefreshTokenRepository,
    private tokenBlacklistRepository: TokenBlacklistRepository,
    private companyService: CompanyService,
    private auditLogService: AuditLogService,
    private rbacService: RbacService,
    private emailService: EmailService,
    private dataSource: DataSource,
  ) {}

  private get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET')!;
  }

  async login(email: string, passwordPlain: string, ip?: string, userAgent?: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMs = new Date(user.locked_until).getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new ForbiddenException(`Cuenta bloqueada temporalmente. Intenta de nuevo en ${remainingMin} minuto(s).`);
    }

    const isPasswordValid = await bcrypt.compare(passwordPlain, user.password_hash);
    if (!isPasswordValid) {
      await this.userRepository.incrementFailedLoginAttempts(user.id);

      const updatedUser = await this.userRepository.findByEmail(email);
      if (updatedUser.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
        await this.userRepository.lockAccount(user.id, LOCK_MINUTES);
        const companyId = await this.getFirstCompanyId(user.id);
        if (companyId) {
          await this.auditLogService.log({
            userId: user.id,
            companyId,
            action: 'ACCOUNT_LOCKED',
            entityType: 'User',
            entityId: user.id,
            newValues: { reason: 'Max failed attempts', lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) },
            ipAddress: ip,
            userAgent,
          });
        }
      }

      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.userRepository.resetFailedLoginAttempts(user.id);
    await this.userRepository.updateLastLogin(user.id);

    const tenants = await this.companyService.getUserCompanies(user.id);
    const companyIds = tenants.map((t: any) => t.id);

    const { companyRoles, companyPermissions } = await this.buildCompanyRolesAndPermissions(user.id, tenants);

    const firstCompanyId = companyIds[0];
    const defaultRoles = firstCompanyId ? (companyRoles[firstCompanyId] || []) : [];
    const defaultPermissions = firstCompanyId ? (companyPermissions[firstCompanyId] || []) : [];

    const { accessToken, refreshToken } = await this.generateTokenPair(user.id, {
      id: user.id,
      must_change_password: user.must_change_password,
      companies: companyIds,
      companyRoles,
      companyPermissions,
      roles: defaultRoles,
      permissions: defaultPermissions,
    });

    const passwordExpired = await this.checkPasswordExpiry(user);

    const companyId = companyIds[0];
    if (companyId) {
      await this.auditLogService.log({
        userId: user.id,
        companyId,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: ip,
        userAgent,
      });
    }

    return {
      message: 'Login exitoso',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        must_change_password: user.must_change_password,
        email_verified: user.email_verified,
        password_expired: passwordExpired,
        phone: user.phone || null,
        avatar_url: user.avatar_url || null,
        position: user.position || null,
        timezone: user.timezone || null,
        locale: user.locale || 'es',
        pending_email: user.pending_email || null,
        tenants,
        roles: defaultRoles,
        permissions: defaultPermissions,
      },
    };
  }

  async refresh(refreshToken: string) {
    let decoded: any;
    try {
      decoded = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('Token inválido');
    }

    const storedToken = await this.refreshTokenRepository.findValid(refreshToken);
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token inválido o revocado');
    }

    // Revocar el viejo y crear el nuevo en UNA transacción: si la creación
    // falla después de revocar, el rollback deja el token viejo válido y el
    // cliente puede reintentar (sin esto el usuario quedaba bloqueado).
    const user = await this.userRepository.findById(decoded.sub);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new ForbiddenException('Cuenta desactivada o bloqueada temporalmente');
    }

    const tenants = await this.companyService.getUserCompanies(user.id);
    const companyIds = tenants.map((t: any) => t.id);

    const { companyRoles, companyPermissions } = await this.buildCompanyRolesAndPermissions(user.id, tenants);

    const firstCompanyId = companyIds[0];
    const defaultRoles = firstCompanyId ? (companyRoles[firstCompanyId] || []) : [];
    const defaultPermissions = firstCompanyId ? (companyPermissions[firstCompanyId] || []) : [];

    const accessToken = this.jwtService.sign({
      id: user.id,
      must_change_password: user.must_change_password,
      companies: companyIds,
      companyRoles,
      companyPermissions,
      roles: defaultRoles,
      permissions: defaultPermissions,
    }, { expiresIn: ACCESS_TOKEN_EXPIRY });

    const newRefreshPayload = { sub: user.id, type: 'refresh' };
    const newRefreshToken = this.jwtService.sign(newRefreshPayload, {
      expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
    });
    const newRefreshExpiresAt = new Date();
    newRefreshExpiresAt.setDate(newRefreshExpiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    const { sha256 } = await import('../common/utils/crypto.js');
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(
        `UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`,
        [sha256(refreshToken)],
      );
      await runner.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [user.id, sha256(newRefreshToken), newRefreshExpiresAt],
      );
      await runner.commitTransaction();
    } catch (err) {
      await runner.rollbackTransaction();
      throw err;
    } finally {
      await runner.release();
    }

    const tokens = { accessToken, refreshToken: newRefreshToken };

    // Auditar rotación de tokens si el usuario ya pertenece a alguna empresa.
    // (usuarios sin empresa aún no tienen companyId para anclar el registro)
    if (firstCompanyId) {
      void this.auditLogService.log({
        userId: user.id,
        companyId: firstCompanyId,
        action: 'TOKEN_REFRESHED',
        entityType: 'Auth',
        entityId: user.id,
      });
    }

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string, accessToken: string, refreshToken?: string) {
    let decoded: any;
    try {
      decoded = this.jwtService.decode(accessToken);
      if (decoded?.exp) {
        await this.tokenBlacklistRepository.add(accessToken, new Date(decoded.exp * 1000));
      }
    } catch {}

    if (refreshToken) {
      await this.refreshTokenRepository.revoke(refreshToken);
    }

    const companyId = await this.getFirstCompanyId(userId);
    if (companyId) {
      await this.auditLogService.log({
        userId,
        companyId,
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: userId,
      });
    }

    return { message: 'Sesión cerrada correctamente' };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const tenants = await this.companyService.getUserCompanies(userId);
    const passwordExpired = await this.checkPasswordExpiry(user);

    const firstCompanyId = tenants[0]?.id;
    let roles: string[] = [];
    let permissions: string[] = [];

    if (firstCompanyId) {
      const result = await this.rbacService.getUserPermissions(userId, firstCompanyId);
      roles = result.roles;
      permissions = result.permissions;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      must_change_password: user.must_change_password,
      email_verified: user.email_verified,
      password_expired: passwordExpired,
      phone: user.phone || null,
      avatar_url: user.avatar_url || null,
      position: user.position || null,
      document_type: user.document_type || null,
      document_number: user.document_number || null,
      timezone: user.timezone || null,
      locale: user.locale || 'es',
      pending_email: user.pending_email || null,
      tenants,
      roles,
      permissions,
    };
  }

  async updateProfile(userId: string, data: {
    name?: string; email?: string; phone?: string; avatar_url?: string;
    position?: string; document_type?: string; document_number?: string;
    timezone?: string; locale?: string;
  }) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const { email, ...profileData } = data;
    let pendingEmail: string | undefined;

    if (email && email !== user.email) {
      const existing = await this.userRepository.findByEmail(email);
      if (existing && existing.id !== userId) {
        throw new ConflictException('El correo electrónico ya está en uso');
      }
      pendingEmail = await this.requestEmailChange(userId, email);
    }

    await this.userRepository.updateProfile(userId, profileData);

    const companyId = await this.getFirstCompanyId(userId);
    if (companyId) {
      await this.auditLogService.log({
        userId,
        companyId,
        action: 'PROFILE_UPDATED',
        entityType: 'User',
        entityId: userId,
        oldValues: {
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          position: user.position || null,
        },
        newValues: {
          ...profileData,
          ...(pendingEmail ? { email: `${pendingEmail} (pendiente de verificación)` } : {}),
        },
      });
    }

    return {
      message: pendingEmail
        ? 'Perfil actualizado. Revisa tu nuevo correo para verificarlo.'
        : 'Perfil actualizado correctamente',
      pending_email: pendingEmail || user.pending_email || null,
    };
  }

  async requestEmailChange(userId: string, newEmail: string): Promise<string> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const token = randomBytes(32).toString('hex');
    await this.userRepository.requestEmailChange(userId, newEmail, token);
    await this.emailService.sendEmailVerification(newEmail, token);

    const companyId = await this.getFirstCompanyId(userId);
    if (companyId) {
      await this.auditLogService.log({
        userId,
        companyId,
        action: 'EMAIL_CHANGE_REQUESTED',
        entityType: 'User',
        entityId: userId,
        oldValues: { email: user.email },
        newValues: { email: `${newEmail} (pendiente de verificación)` },
      });
    }

    return newEmail;
  }

  async resendEmailVerification(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    if (!user.pending_email) {
      throw new ConflictException('No tienes ningún cambio de correo pendiente');
    }

    const token = randomBytes(32).toString('hex');
    await this.userRepository.requestEmailChange(userId, user.pending_email, token);
    await this.emailService.sendEmailVerification(user.pending_email, token);

    return { email: user.pending_email };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepository.findByVerificationToken(token);
    if (!user || !user.pending_email) {
      throw new UnauthorizedException('Enlace de verificación inválido o expirado');
    }

    if (user.email_verification_expires_at && new Date(user.email_verification_expires_at) <= new Date()) {
      throw new UnauthorizedException('El enlace ha expirado. Solicita uno nuevo.');
    }

    await this.userRepository.confirmEmailChange(user.id, user.pending_email);

    const companyId = await this.getFirstCompanyId(user.id);
    if (companyId) {
      await this.auditLogService.log({
        userId: user.id,
        companyId,
        action: 'EMAIL_CHANGE_CONFIRMED',
        entityType: 'User',
        entityId: user.id,
        oldValues: { email: user.email },
        newValues: { email: user.pending_email },
      });
    }

    return { message: 'Correo verificado y actualizado correctamente' };
  }

  async cancelEmailChange(userId: string) {
    await this.userRepository.clearPendingEmail(userId);
    return { message: 'Cambio de correo cancelado' };
  }

  private async buildCompanyRolesAndPermissions(userId: string, tenants: any[]) {
    const results = await Promise.all(
      tenants.map((tenant) => this.rbacService.getUserPermissions(userId, tenant.id)),
    );

    const companyRoles: Record<string, string[]> = {};
    const companyPermissions: Record<string, string[]> = {};
    tenants.forEach((tenant, index) => {
      companyRoles[tenant.id] = results[index].roles;
      companyPermissions[tenant.id] = results[index].permissions;
    });

    return { companyRoles, companyPermissions };
  }

  private async generateTokenPair(userId: string, payload: Record<string, any>) {
    const accessToken = this.jwtService.sign(payload, { expiresIn: ACCESS_TOKEN_EXPIRY });

    const refreshPayload = { sub: userId, type: 'refresh' };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    await this.refreshTokenRepository.create(userId, refreshToken, expiresAt);

    return { accessToken, refreshToken };
  }

  private async checkPasswordExpiry(user: any): Promise<boolean> {
    if (!user.password_changed_at) return false;
    const changedAt = new Date(user.password_changed_at);
    const maxAge = PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    return (Date.now() - changedAt.getTime()) > maxAge;
  }

  private async getFirstCompanyId(userId: string): Promise<string | undefined> {
    const tenants = await this.companyService.getUserCompanies(userId);
    return tenants[0]?.id;
  }
}
