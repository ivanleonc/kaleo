import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import EnergyView from '@/views/EnergyView.vue';
import { useAuthStore } from '@/stores/auth.store';
import { buildMockEnergyDashboard } from '@/services/energy.mock';

const { mockUploadExcel } = vi.hoisted(() => ({
  mockUploadExcel: vi.fn(),
}));

vi.mock('@/services/energy.service', () => ({
  energyService: { uploadExcel: mockUploadExcel },
}));

let wrapper: VueWrapper | null = null;

function makeFile(name = 'facturacion_cauca.xlsx'): File {
  return new File(['contenido'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

async function selectFile(target: VueWrapper, file: File) {
  const input = target.find('input[type="file"]');
  Object.defineProperty(input.element, 'files', {
    value: [file],
    configurable: true,
  });
  await input.trigger('change');
}

function mountView() {
  wrapper = mount(EnergyView, {
    global: {
      stubs: {
        AuthenticatedLayout: { template: '<div><slot /></div>' },
        EnergyCharts: true,
      },
    },
    attachTo: document.body,
  });
  return wrapper;
}

beforeEach(() => {
  setActivePinia(createPinia());
  mockUploadExcel.mockReset();

  const authStore = useAuthStore();
  authStore.user = {
    id: 'user-1',
    name: 'Ana',
    email: 'ana@acme.co',
    tenants: [{ id: 'company-1', name: 'Acme', slug: 'acme' }],
  } as any;
  authStore.activeTenantId = 'company-1';
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

describe('EnergyView', () => {
  it('muestra el panel de carga y luego el dashboard al procesar el Excel', async () => {
    mockUploadExcel.mockImplementation(async (file: File) =>
      buildMockEnergyDashboard(file),
    );
    const view = mountView();
    const file = makeFile();

    expect(view.text()).toContain('Carga tu archivo de facturación');
    expect(view.find('.energy-dashboard').exists()).toBe(false);

    await selectFile(view, file);
    await view.find('.upload-actions button').trigger('click');
    await flushPromises();

    expect(mockUploadExcel).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        onProgress: expect.any(Function),
        signal: expect.anything(),
      }),
    );
    expect(view.find('.energy-dashboard').exists()).toBe(true);
    expect(view.text()).toContain('Clientes facturados');
    expect(view.text()).toContain('Datos de demostración');
    expect(view.text()).toContain('facturacion_cauca.xlsx');
  });

  it('mantiene el panel y muestra el error cuando falla el procesamiento', async () => {
    mockUploadExcel.mockRejectedValue(
      new Error('El archivo no contiene la hoja de facturación.'),
    );
    const view = mountView();

    await selectFile(view, makeFile());
    await view.find('.upload-actions button').trigger('click');
    await flushPromises();

    expect(view.find('.energy-dashboard').exists()).toBe(false);
    expect(view.text()).toContain('El archivo no contiene la hoja de facturación.');
  });

  it('permite reemplazar el archivo desde el dashboard', async () => {
    mockUploadExcel.mockImplementation(async (file: File) =>
      buildMockEnergyDashboard(file),
    );
    const view = mountView();

    await selectFile(view, makeFile('enero.xlsx'));
    await view.find('.upload-actions button').trigger('click');
    await flushPromises();

    expect(view.text()).toContain('enero.xlsx');

    const replaceInputs = view.findAll('input[type="file"]');
    const replaceInput = replaceInputs[replaceInputs.length - 1];
    const replaceFile = makeFile('febrero.xlsx');
    Object.defineProperty(replaceInput!.element, 'files', {
      value: [replaceFile],
      configurable: true,
    });
    await replaceInput!.trigger('change');
    await flushPromises();

    expect(mockUploadExcel).toHaveBeenLastCalledWith(
      replaceFile,
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(view.text()).toContain('febrero.xlsx');
  });
});
