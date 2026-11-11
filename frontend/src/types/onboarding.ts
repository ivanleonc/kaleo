export interface OnboardingState {
  startedAt: string | null;
  completedAt: string | null;
  completed: boolean;
  completedSteps: string[];
  selectedModules: string[];
}

export interface OnboardingStateResponse {
  success: boolean;
  message?: string;
  data: OnboardingState;
}
