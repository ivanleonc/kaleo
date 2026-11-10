import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { withTenantTransaction } from '../../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../../common/tenancy/tenant-context.service.js';
import type {
  BillingPeriod,
  EntitlementLimit,
  LimitKind,
  PlanSummary,
  UsageCounter,
} from './entitlement.types.js';

interface SubscriptionRow {
  id: string;
  status: PlanSummary['status'];
  current_period_start: Date;
  current_period_end: Date | null;
  plan_id: string;
  plan_code: string;
  plan_name: string;
  trial_days: number;
}

@Injectable()
export class EntitlementRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async getActiveSubscription(companyId: string): Promise<{
    planId: string;
    plan: PlanSummary;
  } | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT s.id, s.status, s.current_period_start, s.current_period_end,
                p.id AS plan_id, p.code AS plan_code, p.name AS plan_name,
                p.trial_days
         FROM subscriptions s
         INNER JOIN plans p ON p.id = s.plan_id
         WHERE s.company_id = $1
         ORDER BY s.current_period_start DESC, s.created_at DESC
         LIMIT 1`,
        [companyId],
      );
      const row = rows[0] as SubscriptionRow | undefined;
      if (!row) return null;

      return {
        planId: row.plan_id,
        plan: {
          id: row.id,
          code: row.plan_code,
          name: row.plan_name,
          status: row.status,
          currentPeriodStart: row.current_period_start.toISOString(),
          currentPeriodEnd: row.current_period_end?.toISOString() ?? null,
          trialDays: row.trial_days,
        },
      };
    });
  }

  async getPlanModuleCodes(planId: string): Promise<string[]> {
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT module_code FROM plan_modules WHERE plan_id = $1 ORDER BY module_code`,
        [planId],
      );
      return rows.map((row: { module_code: string }) => row.module_code);
    });
  }

  /**
   * Acceso de lectura: el pack estuvo habilitado para la empresa y salió del
   * plan. Sirve para conservar los datos en solo lectura tras un downgrade.
   */
  async hasCompanyModuleAccess(companyId: string, moduleCode: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT 1 FROM company_modules
         WHERE company_id = $1 AND module_code = $2
           AND status IN ('enabled', 'trial', 'read_only')`,
        [companyId, moduleCode],
      );
      return rows.length > 0;
    });
  }

  async getPlanLimits(planId: string): Promise<EntitlementLimit[]> {
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT module_code, feature_code, limit_value, period, is_hard, limit_kind
         FROM plan_limits
         WHERE plan_id = $1
         ORDER BY module_code, feature_code`,
        [planId],
      );
      return rows.map(mapLimit);
    });
  }

  async getOverrides(companyId: string): Promise<EntitlementLimit[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT module_code, feature_code, limit_value, period, is_hard, limit_kind
         FROM company_entitlements
         WHERE company_id = $1
           AND (expires_at IS NULL OR expires_at > now())
         ORDER BY module_code, feature_code`,
        [companyId],
      );
      return rows.map(mapLimit);
    });
  }

  async getUsage(companyId: string): Promise<UsageCounter[]> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT module_code, feature_code, period_start, used
         FROM usage_counters
         WHERE company_id = $1
         ORDER BY period_start DESC, module_code, feature_code
         LIMIT 200`,
        [companyId],
      );
      return rows.map(
        (row: {
          module_code: string;
          feature_code: string;
          period_start: Date | string;
          used: string | number;
        }) => ({
          moduleCode: row.module_code,
          featureCode: row.feature_code,
          periodStart:
            row.period_start instanceof Date
              ? row.period_start.toISOString().slice(0, 10)
              : String(row.period_start).slice(0, 10),
          used: Number(row.used),
        }),
      );
    });
  }

  async getUsageCounter(
    companyId: string,
    moduleCode: string,
    featureCode: string,
    periodStart: string,
  ): Promise<number> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT used FROM usage_counters
         WHERE company_id = $1 AND module_code = $2
           AND feature_code = $3 AND period_start = $4::date`,
        [companyId, moduleCode, featureCode, periodStart],
      );
      return Number(rows[0]?.used ?? 0);
    });
  }

  async addUsage(
    companyId: string,
    moduleCode: string,
    featureCode: string,
    periodStart: string,
    amount: number,
  ): Promise<number> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `INSERT INTO usage_counters
           (company_id, module_code, feature_code, period_start, used)
         VALUES ($1, $2, $3, $4::date, $5)
         ON CONFLICT (company_id, module_code, feature_code, period_start)
         DO UPDATE SET used = usage_counters.used + EXCLUDED.used,
                       updated_at = now()
         RETURNING used`,
        [companyId, moduleCode, featureCode, periodStart, amount],
      );
      return Number(rows[0]?.used ?? 0);
    });
  }
}

function mapLimit(row: {
  module_code: string;
  feature_code: string;
  limit_value: string | number | null;
  period: BillingPeriod;
  is_hard: boolean;
  limit_kind: LimitKind;
}): EntitlementLimit {
  return {
    moduleCode: row.module_code,
    featureCode: row.feature_code,
    limitValue: row.limit_value === null ? null : Number(row.limit_value),
    period: row.period,
    isHard: row.is_hard,
    limitKind: row.limit_kind,
  };
}
