import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PartiesView from '@/views/PartiesView.vue';

const { mockList, mockGet } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGet: vi.fn(),
}));

vi.mock('@/services/party.service', () => ({
  partyService: {
    list: mockList,
    get: mockGet,
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    addRole: vi.fn(),
    removeRole: vi.fn(),
    addIdentity: vi.fn(),
    removeIdentity: vi.fn(),
    addContact: vi.fn(),
    updateContact: vi.fn(),
    removeContact: vi.fn(),
    addAddress: vi.fn(),
    updateAddress: vi.fn(),
    removeAddress: vi.fn(),
  },
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const PARTY = {
  id: 'party-1',
  company_id: 'company-1',
  party_type: 'organization',
  name: 'Constructora Acme',
  legal_name: 'Constructora Acme SAS',
  tax_id: '900123456',
  email: 'contacto@acme.test',
  phone: '+57 601 555 0101',
  status: 'active',
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  roles: ['customer', 'supplier'],
  identities_count: 2,
  contacts_count: 1,
};

const DETAIL = {
  ...PARTY,
  identities: [
    {
      id: 'identity-1',
      company_id: 'company-1',
      party_id: 'party-1',
      kind: 'email',
      value: 'contacto@acme.test',
      normalized_value: 'contacto@acme.test',
      is_verified: true,
      source_module: 'shared.parties',
      created_at: new Date().toISOString(),
    },
  ],
  contacts: [
    {
      id: 'contact-1',
      company_id: 'company-1',
      party_id: 'party-1',
      name: 'Ana Pérez',
      role_title: 'Compras',
      email: 'ana@acme.test',
      phone: null,
      is_primary: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  addresses: [
    {
      id: 'address-1',
      company_id: 'company-1',
      party_id: 'party-1',
      label: 'Oficina',
      address: 'Calle 10 # 5-25',
      city: 'Bogotá',
      state: 'Cundinamarca',
      country: 'Colombia',
      postal_code: '110111',
      is_primary: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
};

describe('PartiesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockList.mockResolvedValue({ success: true, data: [PARTY], total: 1, page: 1, limit: 25 });
    mockGet.mockResolvedValue({ success: true, data: DETAIL });
  });

  it('lista terceros con sus roles', async () => {
    const wrapper = mount(PartiesView, {
      global: {
        plugins: [createPinia()],
        stubs: { AuthenticatedLayout: { template: '<div><slot /></div>' } },
        directives: { permission: {} },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Constructora Acme');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Proveedor');
    expect(wrapper.text()).toContain('900123456');
    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 25 }),
    );

    wrapper.unmount();
  });

  it('abre el detalle con identidades, contactos y direcciones', async () => {
    const wrapper = mount(PartiesView, {
      global: {
        plugins: [createPinia()],
        stubs: { AuthenticatedLayout: { template: '<div><slot /></div>' } },
        directives: { permission: {} },
      },
    });

    await flushPromises();

    const detailButton = wrapper
      .findAll('button')
      .find((item) => item.text() === 'Ver detalle');
    expect(detailButton).toBeDefined();

    await detailButton!.trigger('click');
    await flushPromises();

    expect(mockGet).toHaveBeenCalledWith('party-1');
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('Detalle del tercero');
    expect(bodyText).toContain('contacto@acme.test');
    expect(bodyText).toContain('Ana Pérez');
    expect(bodyText).toContain('Calle 10 # 5-25');

    wrapper.unmount();
  });
});
