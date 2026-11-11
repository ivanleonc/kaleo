import { Injectable } from '@nestjs/common';
import { CompanySettingsRepository } from './company-settings.repository.js';
import type { CompanySettings, OnboardingState } from './company-settings.types.js';

const EMPTY_ONBOARDING: OnboardingState = {
  startedAt: null,
  completedAt: null,
  completed: false,
  completedSteps: [],
  selectedModules: [],
};

@Injectable()
export class CompanySettingsService {
  constructor(private readonly repository: CompanySettingsRepository) {}

  get(companyId: string): Promise<CompanySettings> {
    return this.repository.get(companyId);
  }

  async getOnboarding(companyId: string): Promise<OnboardingState> {
    const settings = await this.repository.get(companyId);
    return normalizeOnboarding(settings.settings.onboarding);
  }

  async updateOnboarding(
    companyId: string,
    data: {
      completedSteps?: string[];
      selectedModules?: string[];
      completed?: boolean;
    },
  ): Promise<OnboardingState> {
    const current = await this.getOnboarding(companyId);
    const now = new Date().toISOString();

    const completedSteps = unique([
      ...current.completedSteps,
      ...(data.completedSteps ?? []),
    ]);
    const selectedModules = unique([
      ...current.selectedModules,
      ...(data.selectedModules ?? []),
    ]);
    const completed = data.completed ?? current.completed;

    const next: OnboardingState = {
      startedAt: current.startedAt ?? now,
      completedAt: completed ? (current.completedAt ?? now) : current.completedAt,
      completed,
      completedSteps,
      selectedModules,
    };

    const settings = await this.repository.mergeSettings(companyId, { onboarding: next });
    return normalizeOnboarding(settings.settings.onboarding);
  }

  update(
    companyId: string,
    data: {
      currencyCode?: string;
      locale?: string;
      settings?: Record<string, unknown>;
    },
  ): Promise<CompanySettings> {
    return this.repository.update(companyId, data);
  }
}

function normalizeOnboarding(value: unknown): OnboardingState {
  if (!value || typeof value !== 'object') return { ...EMPTY_ONBOARDING };
  const raw = value as Record<string, unknown>;
  return {
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : null,
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : null,
    completed: raw.completed === true,
    completedSteps: stringArray(raw.completedSteps),
    selectedModules: stringArray(raw.selectedModules),
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? unique(value.filter((item): item is string => typeof item === 'string')) : [];
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
