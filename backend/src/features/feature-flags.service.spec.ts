import { describe, expect, it, vi } from 'vitest';
import { FeatureFlagsService } from './feature-flags.service.js';

function createRepository() {
  return {
    isEnabled: vi.fn(),
    listByCompany: vi.fn(),
    upsert: vi.fn(),
  };
}

describe('FeatureFlagsService', () => {
  it('isEnabled devuelve false sin empresa o flag y no consulta', async () => {
    const repository = createRepository();
    const service = new FeatureFlagsService(repository as any);

    await expect(service.isEnabled('', 'a.flag')).resolves.toBe(false);
    await expect(service.isEnabled('company-1', '')).resolves.toBe(false);
    expect(repository.isEnabled).not.toHaveBeenCalled();
  });

  it('isEnabled delega en el repositorio', async () => {
    const repository = createRepository();
    repository.isEnabled.mockResolvedValue(true);
    const service = new FeatureFlagsService(repository as any);

    await expect(service.isEnabled('company-1', 'a.flag')).resolves.toBe(true);
    expect(repository.isEnabled).toHaveBeenCalledWith('company-1', 'a.flag');
  });

  it('enabledMap convierte las filas en un mapa flag → booleano', async () => {
    const repository = createRepository();
    repository.listByCompany.mockResolvedValue([
      { flag: 'a.uno', enabled: true, description: null, updated_at: '2026-11-10T00:00:00Z' },
      { flag: 'a.dos', enabled: false, description: null, updated_at: '2026-11-10T00:00:00Z' },
    ]);
    const service = new FeatureFlagsService(repository as any);

    await expect(service.enabledMap('company-1')).resolves.toEqual({
      'a.uno': true,
      'a.dos': false,
    });
  });

  it('list devuelve vacío sin empresa', async () => {
    const repository = createRepository();
    const service = new FeatureFlagsService(repository as any);

    await expect(service.list('')).resolves.toEqual([]);
    expect(repository.listByCompany).not.toHaveBeenCalled();
  });
});
