import { Injectable, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type {
  BillingInterval,
  BillingPeriod,
  CompanySubscriptionRecord,
  LimitKind,
  PlanLimitInput,
  PlanRecord,
  PlanSummary,
} from './entitlement.types.js';

interface PlanRow {
  id: string;
  code: string;
  name: string;
  trial_days: number;
  billing_interval: BillingInterval;
  price: string | number;
  currency_code: string;
  is_active: boolean;
  created_at: Date | string;
}

interface LimitRow {
  module_code: string;
  feature_code: string;
  limit_value: string | number | null;
  period: BillingPeriod;
  is_hard: boolean;
  limit_kind: LimitKind;
}

interface SubscriptionRow {
  id: string;
  company_id: string;
  company_name: string;
  plan_id: string;
  plan_code: string;
  plan_name: string;
  status: PlanSummary['status'];
  current_period_start: Date | string;
  current_period_end: Date | string | null;
  provider: string | null;
  external_id: string | null;
}

@Injectable()
export class PlanRepository {
  constructor(
    private readonly dataSource: DataSource,
    @Optional() @InjectDataSource('auth') private readonly authDataSource?: DataSource,
  ) {}

  /** Catálogo administrativo: usa la conexión con BYPASSRLS. */
  private get db(): DataSource {
    return this.authDataSource ?? this.dataSource;
  }

  async listPlans(): Promise<PlanRecord[]> {
    const rows = (await this.db.query(
      `SELECT id, code, name, trial_days, billing_interval, price,
              currency_code, is_active, created_at
       FROM plans
       ORDER BY code`,
    )) as PlanRow[];
    return this.attachRelations(rows);
  }

  async findPlanById(id: string): Promise<PlanRecord | null> {
    const rows = (await this.db.query(
      `SELECT id, code, name, trial_days, billing_interval, price,
              currency_code, is_active, created_at
       FROM plans
       WHERE id = $1`,
      [id],
    )) as PlanRow[];
    const plans = await this.attachRelations(rows);
    return plans[0] ?? null;
  }

  async findPlanByCode(code: string): Promise<PlanRecord | null> {
    const rows = (await this.db.query(
      `SELECT id, code, name, trial_days, billing_interval, price,
              currency_code, is_active, created_at
       FROM plans
       WHERE code = $1`,
      [code],
    )) as PlanRow[];
    const plans = await this.attachRelations(rows);
    return plans[0] ?? null;
  }

  async createPlan(input: {
    code: string;
    name: string;
    trialDays: number;
    billingInterval: BillingInterval;
    price: number;
    currencyCode: string;
    isActive: boolean;
  }): Promise<PlanRecord> {
    const rows = (await this.db.query(
      `INSERT INTO plans
         (code, name, trial_days, billing_interval, price, currency_code, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        input.code,
        input.name,
        input.trialDays,
        input.billingInterval,
        input.price,
        input.currencyCode,
        input.isActive,
      ],
    )) as Array<{ id: string }>;
    return (await this.findPlanById(rows[0]!.id))!;
  }

  async updatePlan(
    id: string,
    input: Partial<{
      name: string;
      trialDays: number;
      billingInterval: BillingInterval;
      price: number;
      currencyCode: string;
      isActive: boolean;
    }>,
  ): Promise<PlanRecord | null> {
    const sets: string[] = [];
    const values: unknown[] = [id];

    const add = (column: string, value: unknown) => {
      if (value === undefined) return;
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    add('name', input.name);
    add('trial_days', input.trialDays);
    add('billing_interval', input.billingInterval);
    add('price', input.price);
    add('currency_code', input.currencyCode);
    add('is_active', input.isActive);

    if (sets.length === 0) return this.findPlanById(id);

    await this.db.query(
      `UPDATE plans SET ${sets.join(', ')} WHERE id = $1`,
      values,
    );
    return this.findPlanById(id);
  }

  async replaceModules(planId: string, moduleCodes: string[]): Promise<void> {
    await this.db.transaction(async (manager) => {
      await manager.query(`DELETE FROM plan_modules WHERE plan_id = $1`, [planId]);
      if (moduleCodes.length === 0) return;
      const values = moduleCodes.map((_, index) => `($1, $${index + 2})`).join(', ');
      await manager.query(
        `INSERT INTO plan_modules (plan_id, module_code) VALUES ${values}`,
        [planId, ...moduleCodes],
      );
    });
  }

  async replaceLimits(planId: string, limits: PlanLimitInput[]): Promise<void> {
    await this.db.transaction(async (manager) => {
      await manager.query(`DELETE FROM plan_limits WHERE plan_id = $1`, [planId]);
      for (const limit of limits) {
        await manager.query(
          `INSERT INTO plan_limits
             (plan_id, module_code, feature_code, limit_value, period, is_hard, limit_kind)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            planId,
            limit.moduleCode,
            limit.featureCode,
            limit.limitValue,
            limit.period,
            limit.isHard,
            limit.limitKind ?? 'usage',
          ],
        );
      }
    });
  }

  async findMissingModuleCodes(codes: string[]): Promise<string[]> {
    if (codes.length === 0) return [];
    const rows = (await this.db.query(
      `SELECT code FROM modules WHERE code = ANY($1::text[])`,
      [codes],
    )) as Array<{ code: string }>;
    const found = new Set(rows.map((row) => row.code));
    return codes.filter((code) => !found.has(code));
  }

  async getCoreModuleCodes(): Promise<string[]> {
    const rows = (await this.db.query(
      `SELECT code FROM modules WHERE is_core = TRUE ORDER BY code`,
    )) as Array<{ code: string }>;
    return rows.map((row) => row.code);
  }

  async getCompanySubscription(
    companyId: string,
  ): Promise<CompanySubscriptionRecord | null> {
    const rows = (await this.db.query(
      `SELECT s.id, s.company_id, c.name AS company_name, s.plan_id,
              p.code AS plan_code, p.name AS plan_name, s.status,
              s.current_period_start, s.current_period_end,
              s.provider, s.external_id
       FROM subscriptions s
       INNER JOIN plans p ON p.id = s.plan_id
       INNER JOIN companies c ON c.id = s.company_id
       WHERE s.company_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [companyId],
    )) as SubscriptionRow[];
    return rows[0] ? mapSubscription(rows[0]) : null;
  }

  async assignSubscription(input: {
    companyId: string;
    planId: string;
    status: PlanSummary['status'];
    currentPeriodStart: Date;
    currentPeriodEnd: Date | null;
    provider?: string | null;
    externalId?: string | null;
  }): Promise<CompanySubscriptionRecord> {
    await this.db.transaction(async (manager) => {
      const updated = (await manager.query(
        `UPDATE subscriptions
         SET plan_id = $2, status = $3, current_period_start = $4,
             current_period_end = $5, provider = $6, external_id = $7,
             updated_at = now()
         WHERE company_id = $1
           AND status IN ('trialing', 'active', 'past_due')
         RETURNING id`,
        [
          input.companyId,
          input.planId,
          input.status,
          input.currentPeriodStart,
          input.currentPeriodEnd,
          input.provider ?? null,
          input.externalId ?? null,
        ],
      )) as Array<{ id: string }>;

      if (updated.length === 0) {
        await manager.query(
          `INSERT INTO subscriptions
             (company_id, plan_id, status, current_period_start, current_period_end,
              provider, external_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            input.companyId,
            input.planId,
            input.status,
            input.currentPeriodStart,
            input.currentPeriodEnd,
            input.provider ?? null,
            input.externalId ?? null,
          ],
        );
      }
    });

    return (await this.getCompanySubscription(input.companyId))!;
  }

  private async attachRelations(rows: PlanRow[]): Promise<PlanRecord[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);

    const [moduleRows, limitRows] = await Promise.all([
      this.db.query(
        `SELECT plan_id, module_code FROM plan_modules
         WHERE plan_id = ANY($1::uuid[])
         ORDER BY module_code`,
        [ids],
      ) as Promise<Array<{ plan_id: string; module_code: string }>>,
      this.db.query(
        `SELECT plan_id, module_code, feature_code, limit_value, period,
                is_hard, limit_kind
         FROM plan_limits
         WHERE plan_id = ANY($1::uuid[])
         ORDER BY module_code, feature_code`,
        [ids],
      ) as Promise<Array<LimitRow & { plan_id: string }>>,
    ]);

    const modulesByPlan = new Map<string, string[]>();
    for (const row of moduleRows) {
      const list = modulesByPlan.get(row.plan_id) ?? [];
      list.push(row.module_code);
      modulesByPlan.set(row.plan_id, list);
    }

    const limitsByPlan = new Map<string, PlanLimitInput[]>();
    for (const row of limitRows) {
      const list = limitsByPlan.get(row.plan_id) ?? [];
      list.push({
        moduleCode: row.module_code,
        featureCode: row.feature_code,
        limitValue: row.limit_value === null ? null : Number(row.limit_value),
        period: row.period,
        isHard: row.is_hard,
        limitKind: row.limit_kind,
      });
      limitsByPlan.set(row.plan_id, list);
    }

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      trialDays: row.trial_days,
      billingInterval: row.billing_interval,
      price: Number(row.price),
      currencyCode: row.currency_code.trim(),
      isActive: row.is_active,
      modules: modulesByPlan.get(row.id) ?? [],
      limits: limitsByPlan.get(row.id) ?? [],
      createdAt: toIso(row.created_at),
    }));
  }
}

function mapSubscription(row: SubscriptionRow): CompanySubscriptionRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    planId: row.plan_id,
    planCode: row.plan_code,
    planName: row.plan_name,
    status: row.status,
    currentPeriodStart: toIso(row.current_period_start),
    currentPeriodEnd: row.current_period_end ? toIso(row.current_period_end) : null,
    provider: row.provider,
    externalId: row.external_id,
  };
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
