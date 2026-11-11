import { describe, expect, it, vi } from 'vitest';
import { PartiesService } from './parties.service.js';

const PARTY = {
  id: 'party-1',
  company_id: 'company-1',
  party_type: 'organization',
  name: 'Acme',
  legal_name: null,
  tax_id: null,
  email: 'info@acme.com',
  phone: '+57 601 555 0101',
  status: 'active',
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  roles: ['customer'],
  identities: [],
  contacts: [],
  addresses: [],
};

function createService(overrides: Record<string, any> = {}) {
  const repository = {
    list: vi.fn(async () => ({ data: [], total: 0 })),
    findById: vi.fn(async () => PARTY),
    findByTaxId: vi.fn(async () => null),
    create: vi.fn(async () => PARTY),
    update: vi.fn(async () => PARTY),
    softDelete: vi.fn(async () => true),
    addRole: vi.fn(async (_companyId, _partyId, role) => ({ role })),
    removeRole: vi.fn(async () => true),
    addIdentity: vi.fn(async () => ({ id: 'identity-1' })),
    removeIdentity: vi.fn(async () => true),
    addContact: vi.fn(async () => ({ id: 'contact-1' })),
    updateContact: vi.fn(async () => ({ id: 'contact-1' })),
    removeContact: vi.fn(async () => true),
    addAddress: vi.fn(async () => ({ id: 'address-1' })),
    updateAddress: vi.fn(async () => ({ id: 'address-1' })),
    removeAddress: vi.fn(async () => true),
    ...overrides,
  } as any;
  const entitlements = { assertWritableModule: vi.fn(async () => {}) } as any;
  return { service: new PartiesService(repository, entitlements), repository, entitlements };
}

describe('PartiesService', () => {
  it('crea un tercero normalizando email, teléfono e identidades', async () => {
    const { service, repository, entitlements } = createService();

    await service.create('company-1', 'user-1', {
      partyType: 'organization',
      name: '  Acme  ',
      email: 'INFO@ACME.COM ',
      phone: '+57 (601) 555-0101',
      roles: ['customer', 'supplier'],
    });

    expect(entitlements.assertWritableModule).toHaveBeenCalledWith(
      'company-1',
      'shared.parties',
    );
    expect(repository.create).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.objectContaining({
        name: 'Acme',
        email: 'info@acme.com',
        phone: '+57 (601) 555-0101',
        roles: ['customer', 'supplier'],
        identities: expect.arrayContaining([
          expect.objectContaining({ kind: 'email', normalized: 'info@acme.com' }),
          expect.objectContaining({ kind: 'phone', normalized: '+576015550101' }),
        ]),
      }),
    );
  });

  it('usa el rol contact por defecto', async () => {
    const { service, repository } = createService();

    await service.create('company-1', 'user-1', {
      partyType: 'person',
      name: 'Ana',
    });

    expect(repository.create).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.objectContaining({ roles: ['contact'] }),
    );
  });

  it('rechaza un documento fiscal duplicado', async () => {
    const { service } = createService({ findByTaxId: vi.fn(async () => 'party-other') });

    await expect(
      service.create('company-1', 'user-1', {
        partyType: 'organization',
        name: 'Acme',
        taxId: '900123456',
      }),
    ).rejects.toThrow('documento fiscal');
  });

  it('normaliza identidades de teléfono y WhatsApp', async () => {
    const { service, repository } = createService();

    await service.addIdentity('company-1', 'party-1', {
      kind: 'phone',
      value: '+57 300 123 4567',
    });
    await service.addIdentity('company-1', 'party-1', {
      kind: 'whatsapp',
      value: '(300) 123-4567',
    });

    expect(repository.addIdentity).toHaveBeenNthCalledWith(
      1,
      'company-1',
      'party-1',
      expect.objectContaining({ kind: 'phone', normalized: '+573001234567' }),
    );
    expect(repository.addIdentity).toHaveBeenNthCalledWith(
      2,
      'company-1',
      'party-1',
      expect.objectContaining({ kind: 'whatsapp', normalized: '3001234567' }),
    );
  });

  it('agrega una identidad nueva al cambiar el email', async () => {
    const { service, repository } = createService();

    await service.update('company-1', 'user-1', 'party-1', {
      email: 'NUEVO@ACME.COM',
    });

    expect(repository.update).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      'party-1',
      expect.objectContaining({ email: 'nuevo@acme.com' }),
      [expect.objectContaining({ kind: 'email', normalized: 'nuevo@acme.com' })],
    );
  });

  it('exige escritura habilitada para eliminar', async () => {
    const { service, repository, entitlements } = createService();

    await service.delete('company-1', 'user-1', 'party-1');

    expect(entitlements.assertWritableModule).toHaveBeenCalled();
    expect(repository.softDelete).toHaveBeenCalledWith('company-1', 'user-1', 'party-1');
  });

  it('limpia los campos opcionales de contactos', async () => {
    const { service, repository } = createService();

    await service.addContact('company-1', 'party-1', {
      name: '  Ana  ',
      roleTitle: '  ',
      email: 'ANA@ACME.COM',
      phone: '  ',
    });

    expect(repository.addContact).toHaveBeenCalledWith('company-1', 'party-1', {
      name: 'Ana',
      roleTitle: null,
      email: 'ana@acme.com',
      phone: null,
      isPrimary: undefined,
    });
  });
});
