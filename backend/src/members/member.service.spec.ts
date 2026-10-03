import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MemberService } from './member.service.js';

/**
 * attachMember: asignar usuarios a una empresa explícita.
 * - Usuario existente (por userId o email): solo vincula, sin tocar
 *   contraseña ni enviar correos.
 * - Usuario nuevo: delega en addMember (temporal por correo).
 * - Roles inválidos/ajenos o sin roles: 400 antes de tocar la BD.
 */
describe('MemberService.attachMember', () => {
  const memberRepository: any = {
    findUserById: vi.fn(),
    findUserByEmail: vi.fn(),
    findInvalidRoleIds: vi.fn(async () => []),
    attachExistingUser: vi.fn(),
    addMember: vi.fn(),
  };
  const passwordService: any = { hashPassword: vi.fn(async () => 'hash') };
  const refreshTokenRepository: any = { revokeAllForUser: vi.fn(async () => {}) };
  const emailService: any = { sendTemporaryPassword: vi.fn(async () => {}) };

  let service: MemberService;

  beforeEach(() => {
    vi.clearAllMocks();
    memberRepository.findInvalidRoleIds.mockResolvedValue([]);
    service = new MemberService(
      memberRepository,
      passwordService,
      refreshTokenRepository,
      emailService,
    );
  });

  it('vincula por userId existente sin efectos colaterales', async () => {
    memberRepository.findUserById.mockResolvedValue({ id: 'u-7', name: 'Ana', email: 'ana@x.co' });
    memberRepository.attachExistingUser.mockResolvedValue({ id: 'u-7', roleIds: ['r-1'], isNewUser: false });

    const result = await service.attachMember('company-9', { userId: 'u-7', roleIds: ['r-1'] });

    expect(result).toMatchObject({ id: 'u-7', email: 'ana@x.co', isNewUser: false });
    expect(passwordService.hashPassword).not.toHaveBeenCalled();
    expect(emailService.sendTemporaryPassword).not.toHaveBeenCalled();
  });

  it('vincula por email cuando el usuario ya existe', async () => {
    memberRepository.findUserByEmail.mockResolvedValue({ id: 'u-8', name: 'Beto', email: 'beto@x.co' });
    memberRepository.attachExistingUser.mockResolvedValue({ id: 'u-8', roleIds: ['r-2'], isNewUser: false });

    const result = await service.attachMember('company-9', { email: 'beto@x.co', roleIds: ['r-2'] });

    expect(result).toMatchObject({ id: 'u-8', isNewUser: false });
    expect(memberRepository.addMember).not.toHaveBeenCalled();
  });

  it('crea + envía temporal cuando el email no existe', async () => {
    memberRepository.findUserByEmail.mockResolvedValue(undefined);
    memberRepository.addMember.mockResolvedValue({ id: 'u-9', isNewUser: true });

    const result = await service.attachMember('company-9', {
      email: 'nuevo@x.co',
      name: 'Nuevo',
      roleIds: ['r-1'],
    });

    expect(memberRepository.addMember).toHaveBeenCalledWith(
      'company-9',
      'nuevo@x.co',
      'Nuevo',
      ['r-1'],
      'hash',
      { phone: undefined, position: undefined },
    );
    expect(result.isNewUser).toBe(true);
  });

  it('404 si el userId no existe', async () => {
    memberRepository.findUserById.mockResolvedValue(undefined);
    await expect(
      service.attachMember('company-9', { userId: 'missing', roleIds: ['r-1'] }),
    ).rejects.toThrow(NotFoundException);
    expect(memberRepository.attachExistingUser).not.toHaveBeenCalled();
  });

  it('400 sin roles, con roles ajenos, sin userId/email o sin nombre para nuevo', async () => {
    await expect(service.attachMember('c', { userId: 'u-7', roleIds: [] })).rejects.toThrow(BadRequestException);

    memberRepository.findInvalidRoleIds.mockResolvedValueOnce(['r-x']);
    await expect(
      service.attachMember('c', { userId: 'u-7', roleIds: ['r-x'] }),
    ).rejects.toThrow('no pertenecen a esta empresa');

    await expect(service.attachMember('c', { roleIds: ['r-1'] } as any)).rejects.toThrow(BadRequestException);

    memberRepository.findUserByEmail.mockResolvedValue(undefined);
    await expect(
      service.attachMember('c', { email: 'nuevo@x.co', roleIds: ['r-1'] }),
    ).rejects.toThrow('nombre es requerido');
  });

  it('resuelve roleNames dentro de la empresa destino', async () => {
    memberRepository.findUserById.mockResolvedValue({ id: 'u-7', name: 'Ana', email: 'ana@x.co' });
    memberRepository.resolveRoleIdsByName = vi.fn(async () => ({ ids: ['r-9'], missing: [] }));
    memberRepository.attachExistingUser.mockResolvedValue({ id: 'u-7', roleIds: ['r-9'], isNewUser: false });

    const result = await service.attachMember('company-9', { userId: 'u-7', roleNames: ['Admin'] });

    expect(memberRepository.resolveRoleIdsByName).toHaveBeenCalledWith(['Admin'], 'company-9');
    expect(memberRepository.attachExistingUser).toHaveBeenCalledWith('company-9', 'u-7', ['r-9']);
    expect(result.isNewUser).toBe(false);
  });

  it('400 si un roleName no existe en la empresa destino', async () => {
    memberRepository.resolveRoleIdsByName = vi.fn(async () => ({ ids: [], missing: ['SuperX'] }));

    await expect(
      service.attachMember('company-9', { userId: 'u-7', roleNames: ['SuperX'] }),
    ).rejects.toThrow('no encontrados en esta empresa');
    expect(memberRepository.attachExistingUser).not.toHaveBeenCalled();
  });

  it('searchUsers exige mínimo 2 caracteres', async () => {
    await expect(service.searchUsers('a')).rejects.toThrow(BadRequestException);
    memberRepository.searchUsers = vi.fn(async () => []);
    await service.searchUsers('an');
    expect(memberRepository.searchUsers).toHaveBeenCalledWith('an');
  });
});
