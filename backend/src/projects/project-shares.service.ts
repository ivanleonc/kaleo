import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ProjectSharesRepository, type ShareLinkRow, type ShareScope, type SharedProjectPayload } from './project-shares.repository.js';
import { ProjectsService } from './projects.service.js';
import { EntitlementService } from '../kernel/billing/entitlement.service.js';
import { sha256 } from '../common/utils/crypto.js';

const PROJECTS_MODULE_CODE = 'construction.projects';
const DEFAULT_EXPIRY_DAYS = 30;
const MAX_EXPIRY_DAYS = 365;

export interface CreatedShareLink extends ShareLinkRow {
  /** Token en texto plano. Solo se devuelve una vez, al crear el enlace. */
  token: string;
}

@Injectable()
export class ProjectSharesService {
  constructor(
    private readonly repository: ProjectSharesRepository,
    private readonly projects: ProjectsService,
    private readonly entitlements: EntitlementService,
  ) {}

  async list(companyId: string, projectId: string): Promise<ShareLinkRow[]> {
    await this.projects.get(companyId, projectId);
    return this.repository.list(companyId, projectId);
  }

  async create(
    companyId: string,
    userId: string,
    projectId: string,
    input: { label?: string | null; scope?: ShareScope; expiresInDays?: number | null },
  ): Promise<CreatedShareLink> {
    await this.entitlements.assertWritableModule(companyId, PROJECTS_MODULE_CODE);
    await this.projects.get(companyId, projectId);

    const scope: ShareScope = input.scope === 'summary' ? 'summary' : 'budget';
    const days = input.expiresInDays ?? DEFAULT_EXPIRY_DAYS;
    if (days !== null && (days <= 0 || days > MAX_EXPIRY_DAYS)) {
      throw new BadRequestException(
        `La expiración debe estar entre 1 y ${MAX_EXPIRY_DAYS} días (o ser nula)`,
      );
    }
    const expiresAt =
      days === null ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const token = randomBytes(32).toString('base64url');
    const link = await this.repository.create(
      companyId,
      userId,
      projectId,
      { label: input.label ?? null, scope, expiresAt },
      sha256(token),
    );
    if (!link) throw new BadRequestException('No pudimos crear el enlace');
    return { ...link, token };
  }

  async revoke(companyId: string, projectId: string, id: string): Promise<void> {
    await this.entitlements.assertWritableModule(companyId, PROJECTS_MODULE_CODE);
    const revoked = await this.repository.revoke(companyId, projectId, id);
    if (!revoked) throw new NotFoundException('Enlace no encontrado o ya revocado');
  }

  async resolvePublic(token: string): Promise<SharedProjectPayload> {
    const clean = token?.trim();
    if (!clean) throw new NotFoundException('Enlace inválido');
    const payload = await this.repository.resolveSharedProject(sha256(clean));
    if (!payload) throw new NotFoundException('Enlace inválido, expirado o revocado');
    return payload;
  }
}
