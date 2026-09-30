import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import {
  sortingStateToServer,
  serverToSortingState,
  useControlledSorting,
  useSortingState,
} from '@/composables/useAppTable';

describe('useAppTable — helpers de sort servidor', () => {
  it('convierte el estado TanStack al idioma del backend', () => {
    expect(sortingStateToServer([{ id: 'email', desc: true }])).toEqual({
      sortBy: 'email',
      sortDir: 'desc',
    });
    expect(sortingStateToServer([{ id: 'name', desc: false }])).toEqual({
      sortBy: 'name',
      sortDir: 'asc',
    });
    expect(sortingStateToServer([])).toEqual({});
  });

  it('convierte el sort del store al estado TanStack', () => {
    expect(serverToSortingState({ sortBy: 'name', sortDir: 'desc' })).toEqual([
      { id: 'name', desc: true },
    ]);
    expect(serverToSortingState({})).toEqual([]);
  });

  it('el sorting controlado actualiza el ref y notifica', () => {
    const sorting = useSortingState();
    const seen: unknown[] = [];
    const { state, onSortingChange } = useControlledSorting(sorting, (s) => seen.push(s));

    expect(state.value.sorting).toBe(sorting.value);
    onSortingChange([{ id: 'name', desc: false }]);

    expect(sorting.value).toEqual([{ id: 'name', desc: false }]);
    expect(seen).toEqual([[{ id: 'name', desc: false }]]);
  });

  it('acepta updaters funcionales como TanStack', () => {
    const sorting = useSortingState([{ id: 'name', desc: false }]);
    const { onSortingChange } = useControlledSorting(sorting);

    onSortingChange((prev) => [...prev, { id: 'email', desc: true }]);
    expect(sorting.value).toHaveLength(2);
  });
});
