import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import UiFileDropzone from '@/components/ui/UiFileDropzone.vue';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const excel = new File([new Uint8Array(16)], 'facturacion.xlsx');

function changeFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', {
    value: [file],
    configurable: true,
  });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function dropFile(label: HTMLElement, file: File) {
  const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: { files: [file] },
    configurable: true,
  });
  label.dispatchEvent(event);
}

describe('UiFileDropzone', () => {
  it('emite el archivo seleccionado y reutiliza ids únicos', async () => {
    wrapper = mount(UiFileDropzone, {
      props: { modelValue: null, label: 'Archivo de facturación' },
    });

    const input = wrapper.get<HTMLInputElement>('input[type="file"]');
    expect(input.attributes('id')).not.toBe('analysis-file-input');
    expect(input.attributes('id')).toContain('ui-file-dropzone-');

    changeFile(input.element, excel);
    await nextTick();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([excel]);
  });

  it('acepta arrastrar y soltar', async () => {
    wrapper = mount(UiFileDropzone, {
      props: { modelValue: null },
    });

    dropFile(wrapper.get('label').element, excel);
    await nextTick();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([excel]);
  });

  it('muestra el archivo y permite quitarlo', async () => {
    wrapper = mount(UiFileDropzone, {
      props: { modelValue: excel },
    });

    expect(wrapper.text()).toContain('facturacion.xlsx');
    await wrapper.get('.file-remove').trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null]);
  });

  it('no emite ni permite quitar si está deshabilitado', async () => {
    wrapper = mount(UiFileDropzone, {
      props: { modelValue: excel, disabled: true },
    });

    expect(wrapper.get('input[type="file"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.file-remove').exists()).toBe(false);

    dropFile(wrapper.get('label').element, excel);
    await nextTick();

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
