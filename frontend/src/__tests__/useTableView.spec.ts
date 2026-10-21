import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { useTableView } from '@/composables/useTableView';
import { useMemberColumns } from '@/composables/useMemberColumns';
import { STORAGE_KEYS } from '@/utils/storage-keys';
import type { Member } from '@/types/member';

function createStore() {
  return {
    items: [
      {
        id: 'u-1',
        name: 'Ana',
        email: 'ana@x.co',
        roles: [],
        status: 'active',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ] as Member[],
    isLoading: false,
    setSort: vi.fn(async () => {}),
  };
}

describe('useTableView — visibilidad de columnas', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('arranca con todas las columnas visibles y persiste los cambios', async () => {
    const store = createStore();
    const { table, visibleColumnIds } = useTableView(useMemberColumns(), store, {
      columnVisibilityKey: 'members-test',
    });

    expect(visibleColumnIds.value).toEqual([
      'name',
      'email',
      'roles',
      'status',
    ]);

    table.getColumn('email')?.toggleVisibility(false);
    await nextTick();

    expect(visibleColumnIds.value).toEqual(['name', 'roles', 'status']);

    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.tableColumns('members-test')) ?? '{}',
    );
    expect(stored.email).toBe(false);
  });

  it('restaura la visibilidad guardada en localStorage', () => {
    localStorage.setItem(
      STORAGE_KEYS.tableColumns('members-test'),
      JSON.stringify({ email: false, roles: false }),
    );

    const { visibleColumnIds } = useTableView(useMemberColumns(), createStore(), {
      columnVisibilityKey: 'members-test',
    });

    expect(visibleColumnIds.value).toEqual(['name', 'status']);
  });

  it('ignora un estado guardado que oculta todas las columnas', () => {
    localStorage.setItem(
      STORAGE_KEYS.tableColumns('members-test'),
      JSON.stringify({ name: false, email: false, roles: false, status: false }),
    );

    const { visibleColumnIds } = useTableView(useMemberColumns(), createStore(), {
      columnVisibilityKey: 'members-test',
    });

    expect(visibleColumnIds.value.length).toBeGreaterThan(0);
  });

  it('no persiste nada cuando la tabla no tiene key', async () => {
    const store = createStore();
    const { table } = useTableView(useMemberColumns(), store);

    table.getColumn('email')?.toggleVisibility(false);
    await nextTick();

    expect(localStorage.length).toBe(0);
  });
});
