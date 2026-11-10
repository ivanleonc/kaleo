import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InvitationsController } from './invitations.controller.js';
import { InvitationsPublicController } from './invitations-public.controller.js';

function createService() {
  return {
    create: vi.fn(),
    list: vi.fn(),
    revoke: vi.fn(),
    preview: vi.fn(),
    acceptNew: vi.fn(),
    acceptExisting: vi.fn(),
  };
}

describe('InvitationsController', () => {
  it('create exige x-company-id', async () => {
    const service = createService();
    const controller = new InvitationsController(service as any);

    await expect(controller.create('user-1', undefined, {
      email: 'a@b.com', roleIds: ['role-1'],
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create delega en el servicio con empresa y usuario', async () => {
    const service = createService();
    service.create.mockResolvedValue({ id: 'inv-1', email: 'a@b.com', emailSent: true });
    const controller = new InvitationsController(service as any);

    const result = await controller.create('user-1', 'company-1', {
      email: 'a@b.com', roleIds: ['role-1'],
    });

    expect(service.create).toHaveBeenCalledWith('company-1', 'user-1', {
      email: 'a@b.com', roleIds: ['role-1'],
    });
    expect(result.message).toBe('Invitación enviada');
  });

  it('revoke delega y devuelve mensaje', async () => {
    const service = createService();
    service.revoke.mockResolvedValue({ revoked: true });
    const controller = new InvitationsController(service as any);

    const result = await controller.revoke('company-1', '00000000-0000-4000-8000-000000000000');

    expect(service.revoke).toHaveBeenCalled();
    expect(result.message).toBe('Invitación revocada');
  });
});

describe('InvitationsPublicController', () => {
  it('preview delega en el servicio', async () => {
    const service = createService();
    service.preview.mockResolvedValue({ companyName: 'Acme' });
    const controller = new InvitationsPublicController(service as any);

    const result = await controller.preview('token');

    expect(service.preview).toHaveBeenCalledWith('token');
    expect(result.data).toEqual({ companyName: 'Acme' });
  });

  it('accept delega en acceptNew', async () => {
    const service = createService();
    service.acceptNew.mockResolvedValue({ email: 'a@b.com', companyName: 'Acme' });
    const controller = new InvitationsPublicController(service as any);

    await controller.accept({ token: 'token', name: 'Ana', password: 'Abcdef123!' });

    expect(service.acceptNew).toHaveBeenCalledWith('token', 'Ana', 'Abcdef123!');
  });

  it('acceptAuthenticated delega en acceptExisting', async () => {
    const service = createService();
    service.acceptExisting.mockResolvedValue({ companyName: 'Acme', alreadyMember: false });
    const controller = new InvitationsPublicController(service as any);

    await controller.acceptAuthenticated('user-1', { token: 'token' });

    expect(service.acceptExisting).toHaveBeenCalledWith('token', 'user-1');
  });
});
