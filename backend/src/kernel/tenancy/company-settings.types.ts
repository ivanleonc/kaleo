export interface CompanySettings {
  companyId: string;
  currencyCode: string;
  locale: string;
  settings: Record<string, unknown>;
  updatedAt: string;
}

export interface OnboardingState {
  startedAt: string | null;
  completedAt: string | null;
  completed: boolean;
  completedSteps: string[];
  selectedModules: string[];
}
