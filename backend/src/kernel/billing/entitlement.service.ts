import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EntitlementRepository } from './entitlement.repository.js';
import type {
  BillingPeriod,
  EntitlementLimit,
  EntitlementsSnapshot,
} from './entitlement.types.js';

@Injectable()
export class EntitlementService {
  constructor(private readonly repository: EntitlementRepository) {}

  async getSnapshot(companyId: string): Promise<EntitlementsSnapshot> {
    const subscription = await this.repository.getActiveSubscription(companyId);
    if (!subscription) {
      return { plan: null, modules: [], limits: [], overrides: [], usage: [] };
    }

    const [modules, limits, overrides, usage] = await Promise.all([
      this.repository.getPlanModuleCodes(subscription.planId),
      this.repository.getPlanLimits(subscription.planId),
      this.repository.getOverrides(companyId),
      this.repository.getUsage(companyId),
    ]);

    return {
      plan: subscription.plan,
      modules,
      limits,
      overrides,
      usage,
    };
  }

  /** Los core son always-on; el resto requiere estar incluido en el plan. */
  async isModuleIncluded(companyId: string, moduleCode: string): Promise<boolean> {
    if (moduleCode.startsWith('core.')) return true;

    const modules = await this.getPlanModuleCodes(companyId);
    return modules.includes(moduleCode);
  }

  async getPlanModuleCodes(companyId: string): Promise<string[]> {
    const subscription = await this.repository.getActiveSubscription(companyId);
    if (!subscription) return [];
    return this.repository.getPlanModuleCodes(subscription.planId);
  }

  async assertModule(companyId: string, moduleCode: string): Promise<void> {
    if (await this.isModuleIncluded(companyId, moduleCode)) return;

    throw new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        message: `El módulo "${moduleCode}" no está incluido en el plan actual`,
        code: 'MODULE_NOT_ENTITLED',
        moduleCode,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  async getLimit(
    companyId: string,
    moduleCode: string,
    featureCode: string,
  ): Promise<EntitlementLimit | null> {
    const overrides = await this.repository.getOverrides(companyId);
    const override = overrides.find(
      (item) => item.moduleCode === moduleCode && item.featureCode === featureCode,
    );
    if (override) return override;

    const subscription = await this.repository.getActiveSubscription(companyId);
    if (!subscription) return null;

    const limits = await this.repository.getPlanLimits(subscription.planId);
    return (
      limits.find(
        (item) => item.moduleCode === moduleCode && item.featureCode === featureCode,
      ) ?? null
    );
  }

  async assertWithinLimit(
    companyId: string,
    moduleCode: string,
    featureCode: string,
    amount = 1,
  ): Promise<void> {
    const limit = await this.getLimit(companyId, moduleCode, featureCode);
    if (!limit || limit.limitValue === null) return;

    const periodStart = periodStartFor(limit.period);
    const used = await this.repository.getUsageCounter(
      companyId,
      moduleCode,
      featureCode,
      periodStart,
    );

    if (used + amount > limit.limitValue) {
      if (!limit.isHard) return;
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: `Límite alcanzado para ${moduleCode}.${featureCode}`,
          code: 'LIMIT_EXCEEDED',
          moduleCode,
          featureCode,
          limit: limit.limitValue,
          used,
          period: limit.period,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  /** Registra consumo. Llamar después de completar la operación de negocio. */
  async consume(
    companyId: string,
    moduleCode: string,
    featureCode: string,
    amount = 1,
  ): Promise<number> {
    const limit = await this.getLimit(companyId, moduleCode, featureCode);
    const periodStart = periodStartFor(limit?.period ?? 'month');
    return this.repository.addUsage(
      companyId,
      moduleCode,
      featureCode,
      periodStart,
      amount,
    );
  }
}

function periodStartFor(period: BillingPeriod, now = new Date()): string {
  const year = now.getUTCFullYear();
  if (period === 'year') return `${year}-01-01`;
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}
