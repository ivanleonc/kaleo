import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClipboard } from '@/composables/useClipboard';
import { useToast } from '@/composables/useToast';

const toast = useToast();

beforeEach(() => {
  toast.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useClipboard', () => {
  it('usa la API del portapapeles y muestra el mensaje de éxito', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const { copyToClipboard } = useClipboard();
    const result = await copyToClipboard('texto', 'Copiado');

    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('texto');
    expect(toast.toasts.value.map((item) => item.message)).toContain('Copiado');
  });

  it('usa el fallback sin HTTPS y verifica el resultado', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', {
      value: execCommand,
      configurable: true,
    });

    const { copyToClipboard } = useClipboard();
    const result = await copyToClipboard('texto');

    expect(result).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
    expect(toast.toasts.value).toHaveLength(0);
  });

  it('informa error si el fallback falla', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn(() => false),
      configurable: true,
    });

    const { copyToClipboard } = useClipboard();
    const result = await copyToClipboard('texto');

    expect(result).toBe(false);
    expect(toast.toasts.value[0]?.type).toBe('error');
    expect(document.querySelector('textarea')).toBeNull();
  });
});
