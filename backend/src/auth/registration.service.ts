import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repositories/user.repository.js';
import { RefreshTokenRepository } from './repositories/refresh-token.repository.js';
import { CompanyService } from '../company/company.service.js';
import { RbacService } from '../rbac/rbac.service.js';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class RegistrationService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    private refreshTokenRepository: RefreshTokenRepository,
    private companyService: CompanyService,
    private rbacService: RbacService,
  ) {}

  async register(email: string, passwordPlain: string, name?: string) {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    const passwordHash = await bcrypt.hash(passwordPlain, SALT_ROUNDS);
    const newUser = await this.userRepository.create(email, passwordHash, name);

    const tenants = await this.companyService.getUserCompanies(newUser.id);
    const companyIds = tenants.map((t: any) => t.id);

    const { companyRoles, companyPermissions } = await this.buildCompanyRolesAndPermissions(newUser.id, tenants);

    const firstCompanyId = companyIds[0];
    const defaultRoles = firstCompanyId ? (companyRoles[firstCompanyId] || []) : [];
    const defaultPermissions = firstCompanyId ? (companyPermissions[firstCompanyId] || []) : [];

    const { accessToken, refreshToken } = await this.generateTokenPair(newUser.id, {
      id: newUser.id,
      must_change_password: newUser.must_change_password,
      companies: companyIds,
      companyRoles,
      companyPermissions,
      roles: defaultRoles,
      permissions: defaultPermissions,
    });

    return {
      message: 'Usuario registrado exitosamente',
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        must_change_password: newUser.must_change_password,
        email_verified: newUser.email_verified,
        password_expired: false,
        phone: null,
        avatar_url: null,
        position: null,
        timezone: null,
        locale: 'es',
        pending_email: null,
        tenants,
        roles: defaultRoles,
        permissions: defaultPermissions,
      },
    };
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
}
