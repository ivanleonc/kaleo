export type BillingPeriod = 'none' | 'month' | 'year';
export type LimitKind = 'usage' | 'gauge';

export interface PlanSummary {
  id: string;
  code: string;
  name: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  trialDays?: number;
}

export interface EntitlementLimit {
  moduleCode: string;
  featureCode: string;
  limitValue: number | null;
  period: BillingPeriod;
  isHard: boolean;
  limitKind?: LimitKind;
}

export interface UsageCounter {
  moduleCode: string;
  featureCode: string;
  periodStart: string;
  used: number;
}

export interface EntitlementsSnapshot {
  plan: PlanSummary | null;
  modules: string[];
  limits: EntitlementLimit[];
  overrides: EntitlementLimit[];
  usage: UsageCounter[];
  readOnly: boolean;
  trialEndsAt: string | null;
}

export type BillingInterval = 'month' | 'year';

/** Límite tal como se administra desde el catálogo de planes. */
export interface PlanLimitInput {
  moduleCode: string;
  featureCode: string;
  limitValue: number | null;
  period: BillingPeriod;
  isHard: boolean;
  limitKind?: LimitKind;
}

export interface PlanRecord {
  id: string;
  code: string;
  name: string;
  trialDays: number;
  billingInterval: BillingInterval;
  price: number;
  currencyCode: string;
  isActive: boolean;
  modules: string[];
  limits: PlanLimitInput[];
  createdAt: string;
}

export interface CompanySubscriptionRecord {
  id: string;
  companyId: string;
  companyName: string;
  planId: string;
  planCode: string;
  planName: string;
  status: PlanSummary['status'];
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  provider: string | null;
  externalId: string | null;
}
