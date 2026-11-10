export type BillingPeriod = 'none' | 'month' | 'year';
export interface PlanSummary {
    id: string;
    code: string;
    name: string;
    status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
    currentPeriodStart: string;
    currentPeriodEnd: string | null;
}
export interface EntitlementLimit {
    moduleCode: string;
    featureCode: string;
    limitValue: number | null;
    period: BillingPeriod;
    isHard: boolean;
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
}
