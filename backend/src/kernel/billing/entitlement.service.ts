import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EntitlementRepository } from './entitlement.repository.js';
import type {
  BillingPeriod,
  EntitlementLimit,
  EntitlementsSnapshot,
  PlanSummary,
} from './entitlement.types.js';

@Injectable()
export class EntitlementService {
  constructor(private readonly repository: EntitlementRepository) {}

  async getSnapshot(companyId: string): Promise<EntitlementsSnapshot> {
    const subscription = await this.repository.getActiveSubscription(companyId);
    if (!subscription) {
      return {
        plan: null,
        modules: [],
        limits: [],
        overrides: [],
        usage: [],
        readOnly: false,
        trialEndsAt: null,
      };
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
      readOnly: isSubscriptionReadOnly(subscription.plan),
      trialEndsAt:
        subscription.plan.status === 'trialing' ? subscription.plan.currentPeriodEnd : null,
    };
  }

  /** Los core son always-on; el resto requiere plan o acceso previo (read-only). */
  async isModuleIncluded(companyId: string, moduleCode: string): Promise<boolean> {
    if (moduleCode.startsWith('core.')) return true;

    const modules = await this.getPlanModuleCodes(companyId);
    if (modules.includes(moduleCode)) return true;
    return this.repository.hasCompanyModuleAccess(companyId, moduleCode);
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

  /**
   * Solo plan vigente: habilita packs (escritura) y la activación desde el
   * admin. Un pack conservado en solo lectura no cuenta aquí.
   */
  async assertPlanModule(companyId: string, moduleCode: string): Promise<void> {
    if (moduleCode.startsWith('core.')) return;

    const modules = await this.getPlanModuleCodes(companyId);
    if (modules.includes(moduleCode)) return;

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

  /** Escrituras: core siempre; packs requieren plan vigente y no read-only. */
  async assertWritableModule(companyId: string, moduleCode: string): Promise<void> {
    if (moduleCode.startsWith('core.')) return;

    const subscription = await this.repository.getActiveSubscription(companyId);
    if (!subscription) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: `El módulo "${moduleCode}" no está incluido en el plan actual`,
          code: 'MODULE_NOT_ENTITLED',
          moduleCode,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const modules = await this.repository.getPlanModuleCodes(subscription.planId);
    if (!modules.includes(moduleCode)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: `El módulo "${moduleCode}" no está incluido en el plan actual`,
          code: 'MODULE_NOT_ENTITLED',
          moduleCode,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    if (isSubscriptionReadOnly(subscription.plan)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: 'La suscripción está en solo lectura. Renueva el plan para escribir.',
          code: 'SUBSCRIPTION_READ_ONLY',
          moduleCode,
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async isReadOnly(companyId: string): Promise<boolean> {
    const subscription = await this.repository.getActiveSubscription(companyId);
    return subscription ? isSubscriptionReadOnly(subscription.plan) : false;
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

  /**
   * Límite de valor actual (gauge), por ejemplo miembros activos.
   * `current` lo calcula el dominio antes de crear el nuevo registro.
   */
  async assertGaugeLimit(
    companyId: string,
    moduleCode: string,
    featureCode: string,
    current: number,
    amount = 1,
  ): Promise<void> {
    const limit = await this.getLimit(companyId, moduleCode, featureCode);
    if (!limit || limit.limitValue === null) return;
    if (current + amount <= limit.limitValue) return;
    if (!limit.isHard) return;

    throw new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        message: `Límite alcanzado para ${moduleCode}.${featureCode}`,
        code: 'LIMIT_EXCEEDED',
        moduleCode,
        featureCode,
        limit: limit.limitValue,
        used: current,
        period: limit.period,
        limitKind: 'gauge',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

function isSubscriptionReadOnly(plan: PlanSummary): boolean {
  if (plan.status === 'past_due' || plan.status === 'canceled' || plan.status === 'expired') {
    return true;
  }
  return Boolean(
    plan.currentPeriodEnd && new Date(plan.currentPeriodEnd).getTime() <= Date.now(),
  );
}

function periodStartFor(period: BillingPeriod, now = new Date()): string {
  const year = now.getUTCFullYear();
  if (period === 'year') return `${year}-01-01`;
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}
