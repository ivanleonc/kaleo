import { Injectable, ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import { CompanyRepository } from './repositories/company.repository.js';
import { AuditLogService } from '../audit/audit-log.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import { slugify, slugWithSuffix } from '../common/utils/slug.util.js';
// import { AuditLogService } from '../audit/audit-log.service'; // TODO: Migrar

@Injectable()
export class CompanyService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly auditLogService: AuditLogService,
    private readonly outboxService: OutboxService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /** Normaliza y valida disponibilidad de un slug explícito. */
  private async ensureSlugAvailable(rawSlug: string, excludeCompanyId?: string): Promise<string> {
    const candidate = slugify(rawSlug);
    const taken = await this.companyRepository.findBySlug(candidate, excludeCompanyId);
    if (taken) {
      throw new ConflictException('Ese identificador corto ya está en uso');
    }
    return candidate;
  }

  /** Deriva un slug del nombre y le agrega sufijo numérico si está tomado. */
  private async generateUniqueSlug(name: string, excludeCompanyId?: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 1;

    while (await this.companyRepository.findBySlug(candidate, excludeCompanyId)) {
      suffix += 1;
      candidate = slugWithSuffix(base, suffix);
      if (suffix > 1000) break; // guarda contra loop infinito
    }

    return candidate;
  }

  async getUserCompanies(userId: string) {
    return await this.companyRepository.getUserCompanies(userId); //[cite: 12]
  }

  async getAllCompanies() {
    return await this.companyRepository.getAllCompanies();
  }

  async getCompanyDetail(userId: string, companyId: string, opts?: { isSuperAdmin?: boolean }) {
    // El super-admin accede virtualmente sin fila en user_contexts.
    if (!opts?.isSuperAdmin) {
      const operatorData = await this.companyRepository.verifyUserBelongsToCompany(userId, companyId);
      if (!operatorData) {
        throw new ForbiddenException('No tienes acceso a esta empresa');
      }
    }
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return company;
  }

  async createCompany(userId: string, name: string, taxId?: string, slug?: string) {
    const finalSlug = slug
      ? await this.ensureSlugAvailable(slug)
      : await this.generateUniqueSlug(name);

    const context = this.tenantContext.get();
    const newCompany = await this.companyRepository.createWithOwner(
      userId,
      name,
      taxId,
      finalSlug,
      async (queryRunner, company) => {
        await this.auditLogService.logInTransaction(queryRunner, {
          companyId: company.id,
          userId,
          action: 'POST /api/companies',
          entityType: 'Company',
          entityId: company.id,
          newValues: {
            id: company.id,
            name: company.name,
            tax_id: company.tax_id,
            slug: company.slug,
          },
          responseStatus: 201,
          moduleCode: 'core.tenancy',
          source: 'api',
          requestId: context?.requestId,
          actorType: 'user',
          actorId: userId,
        });

        await this.outboxService.enqueue(
          {
            companyId: company.id,
            aggregateType: 'Company',
            aggregateId: company.id,
            eventType: 'company.created',
            payload: { companyId: company.id, name: company.name, slug: company.slug },
          },
          queryRunner,
        );
      },
    );

    return newCompany;
  }

  async updateCompanyInfo(userId: string, companyId: string, data: {
    name?: string; tax_id?: string; logo_url?: string; phone?: string; email?: string;
    address?: string; city?: string; state?: string; country?: string;
    postal_code?: string; timezone?: string; slug?: string;
  }, opts?: { isSuperAdmin?: boolean }) {
    if (!opts?.isSuperAdmin) {
      const operatorData = await this.companyRepository.verifyUserBelongsToCompany(userId, companyId); //[cite: 12]

      if (!operatorData) {
        throw new ForbiddenException('No tienes acceso a esta empresa'); //[cite: 12]
      }

      // Verificamos por nombre de rol en lugar de ID estático (más seguro para UUIDs)[cite: 12]
      if (!operatorData.roles.includes('Owner')) {
        throw new ForbiddenException('Operación denegada. Solo el Owner puede modificar la configuración.'); //[cite: 12]
      }
    }

    if (data.slug !== undefined) {
      const raw = (data.slug ?? '').toString().trim();
      if (raw === '') {
        // Vaciar el slug no lo deja en NULL: se regenera desde el nombre para
        // que toda empresa conserve una URL legible.
        const currentName =
          data.name ?? (await this.companyRepository.findById(companyId))?.name ?? 'empresa';
        data.slug = await this.generateUniqueSlug(currentName, companyId);
      } else {
        data.slug = await this.ensureSlugAvailable(raw, companyId);
      }
    }

    let updatedCompany;
    try {
      updatedCompany = await this.companyRepository.update(companyId, data); //[cite: 12]
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException('Ese identificador corto ya está en uso');
      }
      throw error;
    }

    /* TODO: Migrar auditoría[cite: 12]
    this.auditLogger.log({ ... });
    */

    return updatedCompany; //[cite: 12]
  }
}