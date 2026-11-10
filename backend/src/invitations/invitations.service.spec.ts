import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InvitationsService } from './invitations.service.js';

function createDependencies() {
  const repository = {
    create: vi.fn(),
    findPendingByTokenHash: vi.fn(),
    findUserByEmail: vi.fn(),
    findUserById: vi.fn(),
    acceptForNewUser: vi.fn(),
    acceptForExistingUser: vi.fn(),
    listPending: vi.fn(),
    revoke: vi.fn(),
  };
  const memberRepository = { findInvalidRoleIds: vi.fn() };
  const companyRepository = { findById: vi.fn() };
  const emailService = { sendInvitation: vi.fn() };
  const passwordService = { hashPassword: vi.fn() };
  const configService = { get: vi.fn().mockReturnValue('http://localhost:5173') };
  const service = new InvitationsService(
    repository as any,
    memberRepository as any,
    companyRepository as any,
    emailService as any,
    passwordService as any,
    configService as any,
  );
  return { service, repository, memberRepository, companyRepository, emailService, passwordService };
}

const future = new Date(Date.now() + 86400000).toISOString();

describe('InvitationsService.create', () => {
  it('normaliza email, valida roles y envía la invitación', async () => {
    const deps = createDependencies();
    deps.memberRepository.findInvalidRoleIds.mockResolvedValue([]);
    deps.companyRepository.findById.mockResolvedValue({ name: 'Acme' });
    deps.repository.create.mockResolvedValue({
      id: 'inv-1', email: 'ana@acme.com', expires_at: future,
    });
    deps.emailService.sendInvitation.mockResolvedValue(undefined);

    const result = await deps.service.create('company-1', 'user-1', {
      email: '  Ana@Acme.com ',
      roleIds: ['role-1'],
    });

    expect(result.email).toBe('ana@acme.com');
    expect(result.emailSent).toBe(true);
    expect(deps.repository.create).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'company-1',
      email: 'ana@acme.com',
      roleIds: ['role-1'],
    }));
    expect(deps.emailService.sendInvitation).toHaveBeenCalledWith(
      'ana@acme.com',
      'Acme',
      expect.stringContaining('/accept-invitation?token='),
    );
  });

  it('exige al menos un rol', async () => {
    const deps = createDependencies();

    await expect(deps.service.create('company-1', 'user-1', {
      email: 'ana@acme.com',
      roleIds: [],
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza roles de otra empresa', async () => {
    const deps = createDependencies();
    deps.memberRepository.findInvalidRoleIds.mockResolvedValue(['role-x']);

    await expect(deps.service.create('company-1', 'user-1', {
      email: 'ana@acme.com',
      roleIds: ['role-x'],
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no falla si el email no se pudo enviar', async () => {
    const deps = createDependencies();
    deps.memberRepository.findInvalidRoleIds.mockResolvedValue([]);
    deps.companyRepository.findById.mockResolvedValue({ name: 'Acme' });
    deps.repository.create.mockResolvedValue({
      id: 'inv-1', email: 'ana@acme.com', expires_at: future,
    });
    deps.emailService.sendInvitation.mockRejectedValue(new Error('smtp down'));

    const result = await deps.service.create('company-1', 'user-1', {
      email: 'ana@acme.com',
      roleIds: ['role-1'],
    });

    expect(result.emailSent).toBe(false);
  });
});

describe('InvitationsService.preview', () => {
  it('indica requiresLogin si el email ya tiene cuenta', async () => {
    const deps = createDependencies();
    deps.repository.findPendingByTokenHash.mockResolvedValue({
      id: 'inv-1', company_id: 'c-1', company_name: 'Acme', email: 'ana@acme.com',
      name: null, expires_at: future, role_ids: [],
    });
    deps.repository.findUserByEmail.mockResolvedValue({ id: 'u-1', email: 'ana@acme.com', name: 'Ana' });

    const result = await deps.service.preview('token');

    expect(result.requiresLogin).toBe(true);
    expect(result.companyName).toBe('Acme');
  });

  it('falla si la invitación no existe', async () => {
    const deps = createDependencies();
    deps.repository.findPendingByTokenHash.mockResolvedValue(undefined);

    await expect(deps.service.preview('token')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('InvitationsService.acceptNew', () => {
  it('rechaza si el email ya tiene cuenta', async () => {
    const deps = createDependencies();
    deps.repository.findPendingByTokenHash.mockResolvedValue({
      id: 'inv-1', company_id: 'c-1', company_name: 'Acme', email: 'ana@acme.com',
      name: null, expires_at: future, role_ids: ['role-1'],
    });
    deps.repository.findUserByEmail.mockResolvedValue({ id: 'u-1', email: 'ana@acme.com', name: 'Ana' });

    await expect(deps.service.acceptNew('token', 'Ana', 'Abcdef123!'))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('crea el usuario y devuelve la empresa', async () => {
    const deps = createDependencies();
    deps.repository.findPendingByTokenHash.mockResolvedValue({
      id: 'inv-1', company_id: 'c-1', company_name: 'Acme', email: 'ana@acme.com',
      name: null, expires_at: future, role_ids: ['role-1'],
    });
    deps.repository.findUserByEmail.mockResolvedValue(undefined);
    deps.passwordService.hashPassword.mockResolvedValue('hash');
    deps.repository.acceptForNewUser.mockResolvedValue({
      id: 'u-1', email: 'ana@acme.com', name: 'Ana',
    });

    const result = await deps.service.acceptNew('token', 'Ana', 'Abcdef123!');

    expect(result).toEqual({ email: 'ana@acme.com', companyName: 'Acme' });
    expect(deps.repository.acceptForNewUser).toHaveBeenCalledWith(expect.objectContaining({
      invitationId: 'inv-1',
      companyId: 'c-1',
      roleIds: ['role-1'],
    }));
  });
});

describe('InvitationsService.acceptExisting', () => {
  it('rechaza si el email no coincide', async () => {
    const deps = createDependencies();
    deps.repository.findPendingByTokenHash.mockResolvedValue({
      id: 'inv-1', company_id: 'c-1', company_name: 'Acme', email: 'ana@acme.com',
      name: null, expires_at: future, role_ids: [],
    });
    deps.repository.findUserById.mockResolvedValue({ id: 'u-1', email: 'otra@acme.com', name: 'Otra' });

    await expect(deps.service.acceptExisting('token', 'u-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('acepta y reporta si ya era miembro', async () => {
    const deps = createDependencies();
    deps.repository.findPendingByTokenHash.mockResolvedValue({
      id: 'inv-1', company_id: 'c-1', company_name: 'Acme', email: 'ana@acme.com',
      name: null, expires_at: future, role_ids: ['role-1'],
    });
    deps.repository.findUserById.mockResolvedValue({ id: 'u-1', email: 'ana@acme.com', name: 'Ana' });
    deps.repository.acceptForExistingUser.mockResolvedValue({ alreadyMember: true });

    const result = await deps.service.acceptExisting('token', 'u-1');

    expect(result).toEqual({ companyName: 'Acme', alreadyMember: true });
  });
});

describe('InvitationsService.revoke', () => {
  it('lanza 404 si no hay pendiente', async () => {
    const deps = createDependencies();
    deps.repository.revoke.mockResolvedValue(false);

    await expect(deps.service.revoke('company-1', 'inv-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
