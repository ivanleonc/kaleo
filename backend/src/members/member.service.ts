import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { MemberRepository } from './repositories/member.repository.js';
import type { SortSpec } from '../common/dto/pagination-query.dto.js';
import { TabularExportService } from '../common/export/tabular-export.service.js';
import type { ExportFile, ExportFormat } from '../common/export/export.types.js';
import { MEMBER_EXPORT_COLUMNS, type MemberExportRow } from './member-export.columns.js';
import { PasswordService } from '../auth/password.service.js';
import { EmailService } from '../email/email.service.js';
import { AuditLogService } from '../audit/audit-log.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import { EntitlementService } from '../kernel/billing/entitlement.service.js';

@Injectable()
export class MemberService {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly passwordService: PasswordService,
    private readonly emailService: EmailService,
    private readonly exportService: TabularExportService,
    private readonly auditLogService: AuditLogService,
    private readonly outboxService: OutboxService,
    private readonly tenantContext: TenantContextService,
    private readonly entitlements: EntitlementService,
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

  async exportMembers(
    companyId: string,
    filters: { search?: string; status?: string; roleId?: string },
    sort: SortSpec,
    format: ExportFormat,
    columns?: string[],
  ): Promise<ExportFile> {
    const rows = (await this.memberRepository.findForExport(
      companyId,
      filters,
      sort,
    )) as MemberExportRow[];
    const selected = this.exportService.resolveColumns(MEMBER_EXPORT_COLUMNS, columns);

    return this.exportService.generate(format, selected, rows, {
      filename: `miembros_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Miembros',
    });
  }

  async addMember(
    companyId: string,
    email: string,
    name: string,
    roleIds: string[],
    extra?: { phone?: string; position?: string; document_type?: string; document_number?: string },
  ) {
    const existingUser = await this.memberRepository.findUserByEmail(email);
    const alreadyMember = existingUser
      ? await this.memberRepository.isAlreadyMember(existingUser.id, companyId)
      : false;
    if (!alreadyMember) {
      await this.assertSeatAvailable(companyId);
    }
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
    if (data.status === 'active' && !(await this.memberRepository.isAlreadyMember(userId, companyId))) {
      await this.assertSeatAvailable(companyId);
    }
    const result = await this.memberRepository.updateMember(companyId, userId, data);
    // No se revocan los refresh tokens globales: la membership inactiva basta
    // para que CompanyAccessGuard bloquee esa empresa, sin afectar a otras.
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
    const context = this.tenantContext.get();
    const result = await this.memberRepository.removeMember(
      companyId,
      userId,
      async (queryRunner, removed) => {
        await this.auditLogService.logInTransaction(queryRunner, {
          companyId,
          userId: context?.userId,
          action: 'DELETE /api/companies/users/:id',
          entityType: 'Member',
          entityId: removed.id,
          oldValues: { id: removed.id, email: removed.email, name: removed.name },
          responseStatus: 200,
          moduleCode: 'core.members',
          source: 'api',
          requestId: context?.requestId,
          actorType: 'user',
          actorId: context?.userId,
        });

        await this.outboxService.enqueue(
          {
            companyId,
            aggregateType: 'Member',
            aggregateId: removed.id,
            eventType: 'member.removed',
            payload: { userId: removed.id, email: removed.email },
          },
          queryRunner,
        );
      },
    );
    // La membership eliminada bloquea el acceso de inmediato vía guard.
    // No se revocan tokens globales para no expulsar al usuario de otras
    // empresas donde sigue siendo miembro.
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
      if (!(await this.memberRepository.isAlreadyMember(user.id, targetCompanyId))) {
        await this.assertSeatAvailable(targetCompanyId);
      }
      const attached = await this.memberRepository.attachExistingUser(targetCompanyId, user.id, roleIds);
      return { ...attached, name: user.name, email: user.email };
    }

    if (!input.email) {
      throw new BadRequestException('Debes indicar userId o email');
    }
    const email: string = input.email;
    const existing = await this.memberRepository.findUserByEmail(email);
    if (existing) {
      if (!(await this.memberRepository.isAlreadyMember(existing.id, targetCompanyId))) {
        await this.assertSeatAvailable(targetCompanyId);
      }
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

  /** Sedes asignadas a un miembro (alcance por sede). */
  async getMemberBranches(companyId: string, targetUserId: string) {
    return this.memberRepository.getMemberBranches(companyId, targetUserId);
  }

  /**
   * Asigna sedes a una membership. Una lista vacía desactiva el alcance por
   * sede para ese usuario (vuelve a ver todas).
   */
  async setMemberBranches(companyId: string, targetUserId: string, branchIds: string[]) {
    await this.memberRepository.setMemberBranches(companyId, targetUserId, branchIds);
    return { message: 'Sedes del miembro actualizadas correctamente' };
  }

  /**
   * Búsqueda de usuarios para autocompletar (solo id/nombre/email).
   * Se limita a miembros de la empresa para no filtrar usuarios de otros tenants.
   */
  async searchUsers(companyId: string, query: string) {
    if (!companyId) {
      throw new BadRequestException('Falta el header x-company-id');
    }
    const q = (query ?? '').trim();
    if (q.length < 2) {
      throw new BadRequestException('La búsqueda requiere al menos 2 caracteres');
    }
    return this.memberRepository.searchUsers(companyId, q);
  }

  private async assertSeatAvailable(companyId: string): Promise<void> {
    const current = await this.memberRepository.countActiveMembers(companyId);
    await this.entitlements.assertGaugeLimit(companyId, 'core.users', 'max_active', current);
  }

  private generateTempPassword(): string {
    // randomBytes(8) gives 16 hex chars (lowercase + digits), append 'Ax' for uppercase + guaranteed mix
    return randomBytes(8).toString('hex') + 'Ax';
  }
}
