import { describe, expect, it, vi } from 'vitest';
import { CompanySettingsService } from './company-settings.service.js';

function createService(settings: Record<string, unknown> = {}) {
  const repository = {
    get: vi.fn(async () => ({
      companyId: 'company-1',
      currencyCode: 'COP',
      locale: 'es-CO',
      settings,
      updatedAt: new Date().toISOString(),
    })),
    mergeSettings: vi.fn(async (_companyId: string, patch: Record<string, unknown>) => ({
      companyId: 'company-1',
      currencyCode: 'COP',
      locale: 'es-CO',
      settings: { ...settings, ...patch },
      updatedAt: new Date().toISOString(),
    })),
  } as any;
  return { service: new CompanySettingsService(repository), repository };
}

describe('CompanySettingsService onboarding', () => {
  it('devuelve un estado vacío cuando no hay onboarding guardado', async () => {
    const { service } = createService();

    await expect(service.getOnboarding('company-1')).resolves.toEqual({
      startedAt: null,
      completedAt: null,
      completed: false,
      completedSteps: [],
      selectedModules: [],
    });
  });

  it('normaliza datos incompletos o inválidos', async () => {
    const { service } = createService({
      onboarding: {
        startedAt: 123,
        completed: 'yes',
        completedSteps: ['empresa', 42, 'empresa'],
      },
    });

    await expect(service.getOnboarding('company-1')).resolves.toEqual({
      startedAt: null,
      completedAt: null,
      completed: false,
      completedSteps: ['empresa'],
      selectedModules: [],
    });
  });

  it('acumula pasos y módulos sin duplicados y marca la fecha de inicio', async () => {
    const { service, repository } = createService({
      onboarding: {
        startedAt: '2026-01-01T00:00:00.000Z',
        completed: false,
        completedSteps: ['empresa'],
        selectedModules: ['shared.documents'],
      },
    });

    const state = await service.updateOnboarding('company-1', {
      completedSteps: ['modulos', 'empresa'],
      selectedModules: ['shared.documents', 'crm.accounts'],
    });

    expect(state.completedSteps).toEqual(['empresa', 'modulos']);
    expect(state.selectedModules).toEqual(['shared.documents', 'crm.accounts']);
    expect(state.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(repository.mergeSettings).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({ onboarding: expect.objectContaining({ completed: false }) }),
    );
  });

  it('guarda completedAt al completar', async () => {
    const { service } = createService();

    const state = await service.updateOnboarding('company-1', { completed: true });

    expect(state.completed).toBe(true);
    expect(state.startedAt).toBeTruthy();
    expect(state.completedAt).toBeTruthy();
  });
});
