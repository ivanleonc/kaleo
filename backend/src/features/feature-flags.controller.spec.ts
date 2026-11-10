import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { FeatureFlagsController } from './feature-flags.controller.js';

function createService() {
  return {
    enabledMap: vi.fn(),
    set: vi.fn(),
  };
}

describe('FeatureFlagsController', () => {
  it('list exige x-company-id', async () => {
    const service = createService();
    const controller = new FeatureFlagsController(service as any);

    await expect(controller.list(undefined)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.enabledMap).not.toHaveBeenCalled();
  });

  it('list devuelve el mapa de flags de la empresa', async () => {
    const service = createService();
    service.enabledMap.mockResolvedValue({ 'a.flag': true });
    const controller = new FeatureFlagsController(service as any);

    const response = await controller.list('company-1');

    expect(response).toEqual({ success: true, data: { 'a.flag': true } });
    expect(service.enabledMap).toHaveBeenCalledWith('company-1');
  });

  it('set valida el formato del flag antes de escribir', async () => {
    const service = createService();
    const controller = new FeatureFlagsController(service as any);

    await expect(
      controller.set('company-1', 'Flag Invalido!', { enabled: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.set).not.toHaveBeenCalled();
  });

  it('set delega con enabled y descripción', async () => {
    const service = createService();
    service.set.mockResolvedValue({ flag: 'crm.v2', enabled: true, description: 'x' });
    const controller = new FeatureFlagsController(service as any);

    const response = await controller.set('company-1', 'crm.v2', {
      enabled: true,
      description: 'x',
    });

    expect(service.set).toHaveBeenCalledWith('company-1', 'crm.v2', true, 'x');
    expect(response).toMatchObject({ success: true, message: 'Feature flag actualizado' });
  });
});
