import type {
  CompanySubscriptionRecord,
  PlanLimitInput,
  PlanRecord,
} from '@saas/shared';
import { apiClient } from '@/api/axios';

export interface PlansResponse {
  success: boolean;
  data: PlanRecord[];
}

export interface PlanResponse {
  success: boolean;
  data: PlanRecord;
}

export interface SubscriptionResponse {
  success: boolean;
  data: CompanySubscriptionRecord | null;
}

export interface CreatePlanPayload {
  code: string;
  name: string;
  trialDays?: number;
  billingInterval?: 'month' | 'year';
  price?: number;
  currencyCode?: string;
  isActive?: boolean;
  modules?: string[];
  limits?: PlanLimitInput[];
}

export interface AssignSubscriptionPayload {
  planCode: string;
  status?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  trialDays?: number;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  provider?: string;
  externalId?: string;
}

export const planAdminService = {
  async list(): Promise<PlansResponse> {
    const response = await apiClient.get<PlansResponse>('/admin/plans');
    return response.data;
  },

  async create(payload: CreatePlanPayload): Promise<PlanResponse> {
    const response = await apiClient.post<PlanResponse>('/admin/plans', payload);
    return response.data;
  },

  async update(id: string, payload: Partial<CreatePlanPayload>): Promise<PlanResponse> {
    const response = await apiClient.put<PlanResponse>(`/admin/plans/${id}`, payload);
    return response.data;
  },

  async setModules(id: string, moduleCodes: string[]): Promise<PlanResponse> {
    const response = await apiClient.put<PlanResponse>(`/admin/plans/${id}/modules`, {
      moduleCodes,
    });
    return response.data;
  },

  async setLimits(id: string, limits: PlanLimitInput[]): Promise<PlanResponse> {
    const response = await apiClient.put<PlanResponse>(`/admin/plans/${id}/limits`, {
      limits,
    });
    return response.data;
  },

  async getSubscription(companyId: string): Promise<SubscriptionResponse> {
    const response = await apiClient.get<SubscriptionResponse>(
      `/admin/companies/${companyId}/subscription`,
    );
    return response.data;
  },

  async assignSubscription(
    companyId: string,
    payload: AssignSubscriptionPayload,
  ): Promise<SubscriptionResponse> {
    const response = await apiClient.put<SubscriptionResponse>(
      `/admin/companies/${companyId}/subscription`,
      payload,
    );
    return response.data;
  },
};
