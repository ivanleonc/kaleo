import { apiClient } from '@/api/axios';
import type { OnboardingStateResponse } from '@/types/onboarding';

export interface UpdateOnboardingPayload {
  completedSteps?: string[];
  selectedModules?: string[];
  completed?: boolean;
}

export const onboardingService = {
  async getState(): Promise<OnboardingStateResponse> {
    const response = await apiClient.get<OnboardingStateResponse>(
      '/company-settings/onboarding',
    );
    return response.data;
  },

  async updateState(payload: UpdateOnboardingPayload): Promise<OnboardingStateResponse> {
    const response = await apiClient.put<OnboardingStateResponse>(
      '/company-settings/onboarding',
      payload,
    );
    return response.data;
  },
};
