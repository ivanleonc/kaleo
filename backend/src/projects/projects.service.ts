import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsRepository } from './projects.repository.js';
import { EntitlementService } from '../kernel/billing/entitlement.service.js';
import {
  PROJECT_ROLES,
  PROJECT_STATUSES,
  type CreateProjectInput,
  type ProjectDetail,
  type ProjectListFilters,
  type ProjectMemberRow,
  type ProjectRole,
  type ProjectRow,
  type UpdateProjectInput,
} from './projects.types.js';

export const PROJECTS_MODULE_CODE = 'construction.projects';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly repository: ProjectsRepository,
    private readonly entitlements: EntitlementService,
  ) {}

  list(
    companyId: string,
    filters: ProjectListFilters,
  ): Promise<{ data: ProjectRow[]; total: number }> {
    return this.repository.list(companyId, filters);
  }

  async get(companyId: string, id: string): Promise<ProjectDetail> {
    const project = await this.repository.findById(companyId, id);
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    return project;
  }

  async create(
    companyId: string,
    userId: string,
    input: CreateProjectInput,
  ): Promise<ProjectDetail> {
    await this.assertWritable(companyId);
    const normalized = await this.validateProject(companyId, input);
    if (await this.repository.findCode(companyId, normalized.code)) {
      throw new ConflictException('Ya existe un proyecto con ese código');
    }
    return this.repository.create(companyId, userId, normalized);
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    input: UpdateProjectInput,
  ): Promise<ProjectDetail> {
    await this.assertWritable(companyId);
    const current = await this.get(companyId, id);
    const merged = await this.validateProject(companyId, {
      code: input.code ?? current.code,
      name: input.name ?? current.name,
      description: input.description === undefined ? current.description : input.description,
      category: input.category === undefined ? current.category : input.category,
      coverUrl: input.coverUrl === undefined ? current.cover_url : input.coverUrl,
      status: input.status ?? current.status,
      branchId: input.branchId === undefined ? current.branch_id : input.branchId,
      clientPartyId:
        input.clientPartyId === undefined ? current.client_party_id : input.clientPartyId,
      currencyCode: input.currencyCode ?? current.currency_code,
      startDate: input.startDate === undefined ? current.start_date : input.startDate,
      endDate: input.endDate === undefined ? current.end_date : input.endDate,
      timezone: input.timezone === undefined ? current.timezone : input.timezone,
      address: input.address === undefined ? current.address : input.address,
    });
    if (normalizedCode(input.code) && normalizedCode(input.code) !== current.code) {
      const existing = await this.repository.findCode(companyId, normalizedCode(input.code)!);
      if (existing && existing !== id) {
        throw new ConflictException('Ya existe un proyecto con ese código');
      }
    }
    const updated = await this.repository.update(companyId, userId, id, {
      ...merged,
      code: normalizedCode(input.code) ?? merged.code,
      name: input.name === undefined ? undefined : merged.name,
      description: input.description === undefined ? undefined : merged.description,
      category: input.category === undefined ? undefined : merged.category,
      coverUrl: input.coverUrl === undefined ? undefined : merged.coverUrl,
      status: input.status,
      branchId: input.branchId,
      clientPartyId: input.clientPartyId,
      currencyCode: input.currencyCode,
      startDate: input.startDate,
      endDate: input.endDate,
      timezone: input.timezone,
      address: input.address,
    });
    if (!updated) throw new NotFoundException('Proyecto no encontrado');
    return updated;
  }

  async delete(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.softDelete(companyId, id);
    if (!deleted) throw new NotFoundException('Proyecto no encontrado');
  }

  async listMembers(companyId: string, projectId: string): Promise<ProjectMemberRow[]> {
    await this.get(companyId, projectId);
    return this.repository.listMembers(companyId, projectId);
  }

  async addMember(
    companyId: string,
    projectId: string,
    userId: string,
    projectRole: ProjectRole,
  ): Promise<ProjectMemberRow> {
    await this.assertWritable(companyId);
    await this.get(companyId, projectId);
    validateRole(projectRole);
    const membership = await this.repository.findMembershipByUser(companyId, userId);
    if (!membership) throw new BadRequestException('El usuario no es miembro activo de la empresa');
    const member = await this.repository.addMember(
      companyId,
      projectId,
      membership.id,
      projectRole,
    );
    if (!member) throw new NotFoundException('Proyecto no encontrado');
    return member;
  }

  async updateMemberRole(
    companyId: string,
    projectId: string,
    membershipId: string,
    projectRole: ProjectRole,
  ): Promise<ProjectMemberRow> {
    await this.assertWritable(companyId);
    validateRole(projectRole);
    const member = await this.repository.updateMemberRole(
      companyId,
      projectId,
      membershipId,
      projectRole,
    );
    if (!member) throw new NotFoundException('Miembro de proyecto no encontrado');
    return member;
  }

  async removeMember(
    companyId: string,
    projectId: string,
    membershipId: string,
  ): Promise<void> {
    await this.assertWritable(companyId);
    const removed = await this.repository.removeMember(companyId, projectId, membershipId);
    if (!removed) throw new NotFoundException('Miembro de proyecto no encontrado');
  }

  private async validateProject(
    companyId: string,
    input: CreateProjectInput,
  ): Promise<CreateProjectInput> {
    const code = requiredText(input.code, 'El código es obligatorio').toLowerCase();
    const name = requiredText(input.name, 'El nombre es obligatorio');
    if (input.status && !PROJECT_STATUSES.includes(input.status)) {
      throw new BadRequestException('Estado de proyecto inválido');
    }
    if (input.startDate && input.endDate && input.endDate < input.startDate) {
      throw new BadRequestException('La fecha final no puede ser anterior a la inicial');
    }
    if (!(await this.repository.currencyExists(input.currencyCode))) {
      throw new BadRequestException('La moneda no existe');
    }
    if (input.branchId && !(await this.repository.branchExists(companyId, input.branchId))) {
      throw new BadRequestException('La sede no existe');
    }
    if (
      input.clientPartyId &&
      !(await this.repository.partyExists(companyId, input.clientPartyId))
    ) {
      throw new BadRequestException('El cliente no existe');
    }
    return {
      ...input,
      code,
      name,
      description: optionalText(input.description),
      category: optionalText(input.category),
      coverUrl: optionalText(input.coverUrl),
      branchId: input.branchId ?? null,
      clientPartyId: input.clientPartyId ?? null,
      startDate: optionalText(input.startDate),
      endDate: optionalText(input.endDate),
      timezone: optionalText(input.timezone),
      address: optionalText(input.address),
      status: input.status ?? 'draft',
    };
  }

  private assertWritable(companyId: string): Promise<void> {
    return this.entitlements.assertWritableModule(companyId, PROJECTS_MODULE_CODE);
  }
}

function requiredText(value: string | null | undefined, message: string): string {
  const text = value?.trim();
  if (!text) throw new BadRequestException(message);
  return text;
}

function optionalText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function normalizedCode(value?: string | null): string | null {
  const text = value?.trim().toLowerCase();
  return text ? text : null;
}

function validateRole(role: ProjectRole): void {
  if (!PROJECT_ROLES.includes(role)) {
    throw new BadRequestException('Rol de proyecto inválido');
  }
}
