import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import EnergyUploadPanel from '@/components/features/energy/EnergyUploadPanel.vue';

function makeFile(name: string, size = 2048): File {
  return new File([new Uint8Array(size)], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

async function selectFile(wrapper: ReturnType<typeof mount>, file: File) {
  const input = wrapper.find('input[type="file"]');
  Object.defineProperty(input.element, 'files', {
    value: [file],
    configurable: true,
  });
  await input.trigger('change');
}

describe('EnergyUploadPanel', () => {
  it('acepta un Excel válido y emite submit', async () => {
    const wrapper = mount(EnergyUploadPanel);
    const file = makeFile('facturacion.xlsx');

    await selectFile(wrapper, file);

    expect(wrapper.text()).toContain('facturacion.xlsx');
    const submit = wrapper.find('.upload-actions button');
    expect(submit.attributes('disabled')).toBeUndefined();

    await submit.trigger('click');

    expect(wrapper.emitted('submit')).toEqual([[file]]);
  });

  it('rechaza archivos que no son Excel', async () => {
    const wrapper = mount(EnergyUploadPanel);

    await selectFile(wrapper, makeFile('informe.pdf'));

    expect(wrapper.text()).toContain('Selecciona un archivo de Excel');
    expect(wrapper.find('.upload-actions button').attributes('disabled')).toBeDefined();
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('rechaza archivos de más de 10 MB', async () => {
    const wrapper = mount(EnergyUploadPanel);

    await selectFile(wrapper, makeFile('grande.xlsx', 10 * 1024 * 1024 + 1));

    expect(wrapper.text()).toContain('supera el límite de 10 MB');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('muestra el error del store y lo limpia al elegir un archivo válido', async () => {
    const wrapper = mount(EnergyUploadPanel, {
      props: { error: 'Falló el procesamiento anterior.' },
    });

    expect(wrapper.text()).toContain('Falló el procesamiento anterior.');

    await selectFile(wrapper, makeFile('reintento.xlsx'));

    expect(wrapper.emitted('clear-error')).toHaveLength(1);
  });

  it('quitar el archivo deshabilita el envío', async () => {
    const wrapper = mount(EnergyUploadPanel);
    await selectFile(wrapper, makeFile('facturacion.xlsx'));

    await wrapper.find('.file-remove').trigger('click');

    expect(wrapper.text()).not.toContain('facturacion.xlsx');
    expect(wrapper.find('.upload-actions button').attributes('disabled')).toBeDefined();
  });
});
