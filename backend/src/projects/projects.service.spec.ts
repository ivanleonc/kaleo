import { describe, expect, it, vi } from 'vitest';
import { ProjectsService } from './projects.service.js';

const PROJECT = {
  id: 'project-1',
  company_id: 'company-1',
  branch_id: null,
  branch_name: null,
  client_party_id: 'party-1',
  client_name: 'Acme',
  code: 'pry-001',
  name: 'Torre Norte',
  description: null,
  status: 'draft',
  currency_code: 'COP',
  start_date: null,
  end_date: null,
  timezone: 'America/Bogota',
  address: null,
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  members_count: 0,
  members: [],
};

const MEMBER = {
  company_id: 'company-1',
  project_id: 'project-1',
  membership_id: 'membership-1',
  project_role: 'manager',
  created_at: new Date().toISOString(),
  user_id: 'user-1',
  user_name: 'Iván',
  user_email: 'ivan@acme.co',
  membership_status: 'active',
};

function createService(overrides: Record<string, any> = {}) {
  const repository = {
    list: vi.fn(async () => ({ data: [PROJECT], total: 1 })),
    findById: vi.fn(async () => PROJECT),
    findCode: vi.fn(async () => null),
    create: vi.fn(async () => PROJECT),
    update: vi.fn(async () => PROJECT),
    softDelete: vi.fn(async () => true),
    listMembers: vi.fn(async () => [MEMBER]),
    findMembershipByUser: vi.fn(async () => ({ id: 'membership-1', status: 'active' })),
    addMember: vi.fn(async () => MEMBER),
    updateMemberRole: vi.fn(async () => MEMBER),
    removeMember: vi.fn(async () => true),
    branchExists: vi.fn(async () => true),
    partyExists: vi.fn(async () => true),
    currencyExists: vi.fn(async () => true),
    ...overrides,
  } as any;
  const entitlements = { assertWritableModule: vi.fn(async () => {}) } as any;
  return { service: new ProjectsService(repository, entitlements), repository, entitlements };
}

describe('ProjectsService', () => {
  it('crea un proyecto normalizando código y validando referencias', async () => {
    const { service, repository, entitlements } = createService();

    await service.create('company-1', 'user-1', {
      code: ' PRY-001 ',
      name: ' Torre Norte ',
      clientPartyId: 'party-1',
      currencyCode: 'COP',
    });

    expect(entitlements.assertWritableModule).toHaveBeenCalledWith(
      'company-1',
      'construction.projects',
    );
    expect(repository.partyExists).toHaveBeenCalledWith('company-1', 'party-1');
    expect(repository.currencyExists).toHaveBeenCalledWith('COP');
    expect(repository.create).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.objectContaining({ code: 'pry-001', name: 'Torre Norte' }),
    );
  });

  it('rechaza códigos de proyecto duplicados', async () => {
    const { service } = createService({ findCode: vi.fn(async () => 'project-2') });

    await expect(
      service.create('company-1', 'user-1', {
        code: 'PRY-001',
        name: 'Torre Norte',
        currencyCode: 'COP',
      }),
    ).rejects.toThrow('Ya existe un proyecto');
  });

  it('valida fechas y referencias', async () => {
    const { service } = createService();

    await expect(
      service.create('company-1', 'user-1', {
        code: 'PRY-001',
        name: 'Torre Norte',
        currencyCode: 'COP',
        startDate: '2026-12-01',
        endDate: '2026-01-01',
      }),
    ).rejects.toThrow('fecha final');

    const missingParty = createService({ partyExists: vi.fn(async () => false) });
    await expect(
      missingParty.service.create('company-1', 'user-1', {
        code: 'PRY-001',
        name: 'Torre Norte',
        currencyCode: 'COP',
        clientPartyId: 'party-x',
      }),
    ).rejects.toThrow('cliente');
  });

  it('agrega un miembro activo al proyecto', async () => {
    const { service, repository } = createService();

    await service.addMember('company-1', 'project-1', 'user-1', 'manager');

    expect(repository.findMembershipByUser).toHaveBeenCalledWith('company-1', 'user-1');
    expect(repository.addMember).toHaveBeenCalledWith(
      'company-1',
      'project-1',
      'membership-1',
      'manager',
    );
  });

  it('rechaza usuarios que no son miembros de la empresa', async () => {
    const { service } = createService({ findMembershipByUser: vi.fn(async () => null) });

    await expect(
      service.addMember('company-1', 'project-1', 'user-x', 'viewer'),
    ).rejects.toThrow('miembro activo');
  });

  it('exige escritura habilitada para eliminar', async () => {
    const { service, repository, entitlements } = createService();

    await service.delete('company-1', 'project-1');

    expect(entitlements.assertWritableModule).toHaveBeenCalled();
    expect(repository.softDelete).toHaveBeenCalledWith('company-1', 'project-1');
  });
});
