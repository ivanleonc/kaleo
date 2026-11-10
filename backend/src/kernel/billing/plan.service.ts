import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanRepository } from './plan.repository.js';
import type { CreatePlanDto, PlanLimitDto, UpdatePlanDto } from './dto/plan.dto.js';
import type { AssignSubscriptionDto } from './dto/assign-subscription.dto.js';
import type {
  CompanySubscriptionRecord,
  PlanLimitInput,
  PlanRecord,
} from './entitlement.types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PlanService {
  constructor(private readonly repository: PlanRepository) {}

  list(): Promise<PlanRecord[]> {
    return this.repository.listPlans();
  }

  async getById(id: string): Promise<PlanRecord> {
    const plan = await this.repository.findPlanById(id);
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  async create(dto: CreatePlanDto): Promise<PlanRecord> {
    const modules = await this.normalizeModules(dto.modules ?? []);
    const limits = dto.limits ? this.toLimits(dto.limits) : [];
    this.assertLimitsBelongToPlan(limits, modules);

    let plan: PlanRecord;
    try {
      plan = await this.repository.createPlan({
        code: dto.code,
        name: dto.name,
        trialDays: dto.trialDays ?? 0,
        billingInterval: dto.billingInterval ?? 'month',
        price: dto.price ?? 0,
        currencyCode: dto.currencyCode ?? 'COP',
        isActive: dto.isActive ?? true,
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(`Ya existe un plan con código "${dto.code}"`);
      }
      throw error;
    }

    await this.repository.replaceModules(plan.id, modules);
    if (limits.length > 0) {
      await this.repository.replaceLimits(plan.id, limits);
    }
    return this.getById(plan.id);
  }

  async update(id: string, dto: UpdatePlanDto): Promise<PlanRecord> {
    await this.getById(id);
    const plan = await this.repository.updatePlan(id, dto);
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return this.getById(id);
  }

  async setModules(id: string, moduleCodes: string[]): Promise<PlanRecord> {
    await this.getById(id);
    const modules = await this.normalizeModules(moduleCodes);
    await this.repository.replaceModules(id, modules);
    return this.getById(id);
  }

  async setLimits(id: string, limits: PlanLimitDto[]): Promise<PlanRecord> {
    const plan = await this.getById(id);
    const normalized = this.toLimits(limits);
    this.assertLimitsBelongToPlan(normalized, plan.modules);
    await this.repository.replaceLimits(id, normalized);
    return this.getById(id);
  }

  getCompanySubscription(companyId: string): Promise<CompanySubscriptionRecord | null> {
    return this.repository.getCompanySubscription(companyId);
  }

  async assignSubscription(
    companyId: string,
    dto: AssignSubscriptionDto,
  ): Promise<CompanySubscriptionRecord> {
    const plan = await this.repository.findPlanByCode(dto.planCode);
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (!plan.isActive) {
      throw new BadRequestException(`El plan "${plan.code}" está inactivo`);
    }

    const status = dto.status ?? 'active';
    const now = new Date();
    const startsAt = dto.currentPeriodStart ? new Date(dto.currentPeriodStart) : now;
    let endsAt = dto.currentPeriodEnd ? new Date(dto.currentPeriodEnd) : null;

    if (status === 'trialing' && !endsAt) {
      const days = dto.trialDays ?? plan.trialDays ?? 14;
      endsAt = new Date(startsAt.getTime() + days * DAY_MS);
    }

    try {
      return await this.repository.assignSubscription({
        companyId,
        planId: plan.id,
        status,
        currentPeriodStart: startsAt,
        currentPeriodEnd: endsAt,
        provider: dto.provider ?? 'manual',
        externalId: dto.externalId ?? null,
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23503') {
        throw new NotFoundException('Empresa no encontrada');
      }
      throw error;
    }
  }

  /**
   * Normaliza la lista de módulos: únicos, con todos los core siempre
   * incluidos, y valida que existan en el catálogo.
   */
  private async normalizeModules(moduleCodes: string[]): Promise<string[]> {
    const unique = [...new Set(moduleCodes.filter(Boolean))];
    const core = await this.repository.getCoreModuleCodes();
    const modules = [...new Set([...core, ...unique])].sort();

    const missing = await this.repository.findMissingModuleCodes(modules);
    if (missing.length > 0) {
      throw new BadRequestException(`Módulos inexistentes: ${missing.join(', ')}`);
    }
    return modules;
  }

  private toLimits(limits: PlanLimitDto[]): PlanLimitInput[] {
    return limits.map((limit) => ({
      moduleCode: limit.moduleCode,
      featureCode: limit.featureCode,
      limitValue: limit.limitValue ?? null,
      period: limit.period,
      isHard: limit.isHard,
      limitKind: limit.limitKind ?? 'usage',
    }));
  }

  private assertLimitsBelongToPlan(limits: PlanLimitInput[], modules: string[]): void {
    const moduleSet = new Set(modules);
    const invalid = limits
      .filter((limit) => !moduleSet.has(limit.moduleCode))
      .map((limit) => limit.moduleCode);
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Los límites pertenecen a módulos fuera del plan: ${[...new Set(invalid)].join(', ')}`,
      );
    }
  }
}
