import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { InvitationsRepository } from './invitations.repository.js';
import type { PendingInvitation } from './invitations.repository.js';
import { MemberRepository } from '../members/repositories/member.repository.js';
import { CompanyRepository } from '../company/repositories/company.repository.js';
import { EmailService } from '../email/email.service.js';
import { PasswordService } from '../auth/password.service.js';
import { validatePasswordStrength } from '../auth/utils/password-validator.js';
import { sha256 } from '../common/utils/crypto.js';

const INVITATION_TTL_DAYS = 7;

export interface CreateInvitationInput {
  email: string;
  name?: string;
  roleIds: string[];
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly repository: InvitationsRepository,
    private readonly memberRepository: MemberRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly emailService: EmailService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
  ) {}

  async create(companyId: string, invitedBy: string, input: CreateInvitationInput) {
    const email = (input.email ?? '').trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('El email es obligatorio');
    }

    const roleIds = [...new Set((input.roleIds ?? []).filter(Boolean))];
    if (roleIds.length === 0) {
      throw new BadRequestException('Selecciona al menos un rol');
    }

    const invalidRoles = await this.memberRepository.findInvalidRoleIds(roleIds, companyId);
    if (invalidRoles.length > 0) {
      throw new BadRequestException('Uno o más roles no pertenecen a esta empresa');
    }

    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await this.repository.create({
      companyId,
      invitedBy,
      email,
      name: input.name?.trim() || null,
      tokenHash: sha256(token),
      expiresAt,
      roleIds,
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const invitationUrl = `${frontendUrl}/accept-invitation?token=${encodeURIComponent(token)}`;

    let emailSent = true;
    try {
      await this.emailService.sendInvitation(email, company.name, invitationUrl);
    } catch (error) {
      emailSent = false;
      this.logger.error(
        `Invitación ${invitation.id} creada, pero el email a ${email} falló: ${(error as Error).message}`,
      );
    }

    return {
      id: invitation.id,
      email: invitation.email,
      expiresAt: invitation.expires_at,
      emailSent,
    };
  }

  async preview(token: string) {
    const invitation = await this.findValidByToken(token);
    const user = await this.repository.findUserByEmail(invitation.email);

    return {
      email: invitation.email,
      name: invitation.name,
      companyName: invitation.company_name,
      requiresLogin: Boolean(user),
      expiresAt: invitation.expires_at,
    };
  }

  async acceptNew(token: string, name: string, password: string) {
    validatePasswordStrength(password);

    const invitation = await this.findValidByToken(token);
    const existing = await this.repository.findUserByEmail(invitation.email);
    if (existing) {
      throw new ConflictException({
        message: 'Ya tienes cuenta. Inicia sesión para aceptar la invitación.',
        code: 'INVITATION_REQUIRES_LOGIN',
      });
    }

    const passwordHash = await this.passwordService.hashPassword(password);
    try {
      const user = await this.repository.acceptForNewUser({
        invitationId: invitation.id,
        companyId: invitation.company_id,
        email: invitation.email,
        name: name.trim(),
        passwordHash,
        roleIds: invitation.role_ids,
      });
      return { email: user.email, companyName: invitation.company_name };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException({
          message: 'Ya tienes cuenta. Inicia sesión para aceptar la invitación.',
          code: 'INVITATION_REQUIRES_LOGIN',
        });
      }
      throw error;
    }
  }

  async acceptExisting(token: string, userId: string) {
    const invitation = await this.findValidByToken(token);
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException('La invitación no corresponde a tu cuenta');
    }

    const result = await this.repository.acceptForExistingUser({
      invitationId: invitation.id,
      companyId: invitation.company_id,
      userId,
      roleIds: invitation.role_ids,
    });

    return {
      companyName: invitation.company_name,
      alreadyMember: result.alreadyMember,
    };
  }

  async list(companyId: string) {
    return this.repository.listPending(companyId);
  }

  async revoke(companyId: string, invitationId: string) {
    const revoked = await this.repository.revoke(companyId, invitationId);
    if (!revoked) {
      throw new NotFoundException('Invitación pendiente no encontrada');
    }
    return { revoked: true };
  }

  private async findValidByToken(token: string): Promise<PendingInvitation> {
    if (!token) {
      throw new NotFoundException('Invitación inválida o expirada');
    }
    const invitation = await this.repository.findPendingByTokenHash(sha256(token));
    if (!invitation) {
      throw new NotFoundException('Invitación inválida o expirada');
    }
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      throw new NotFoundException('Invitación expirada');
    }
    return invitation;
  }
}
