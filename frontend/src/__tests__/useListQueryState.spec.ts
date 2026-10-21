import { describe, expect, it } from 'vitest';
import {
  buildListQuery,
  emptyListQueryState,
  isSameListQuery,
  parseListQuery,
  type ListQueryConfig,
} from '@/composables/useListQueryState';

const config: ListQueryConfig = {
  filterKeys: ['search', 'status'],
  allowedFilters: { status: ['', 'active', 'inactive'] },
  defaultLimit: 20,
  allowedLimits: [10, 20, 50],
  sortable: ['name', 'created_at'],
};

describe('useListQueryState', () => {
  it('parsea filtros, página, límite y orden válidos', () => {
    expect(parseListQuery({
      search: 'ana',
      status: 'active',
      page: '3',
      limit: '50',
      sortBy: 'name',
      sortDir: 'desc',
    }, config)).toEqual({
      filters: { search: 'ana', status: 'active' },
      page: 3,
      limit: 50,
      sortBy: 'name',
      sortDir: 'desc',
    });
  });

  it('descarta valores no permitidos y usa defaults', () => {
    expect(parseListQuery({
      status: 'borrado',
      page: '-1',
      limit: '999',
      sortBy: 'password',
    }, config)).toEqual({
      filters: { search: '', status: '' },
      page: 1,
      limit: 20,
      sortBy: '',
      sortDir: 'asc',
    });
  });

  it('construye la query omitiendo defaults y conservando claves ajenas', () => {
    const query = buildListQuery({
      filters: { search: 'ana', status: 'active' },
      page: 1,
      limit: 20,
      sortBy: '',
      sortDir: 'asc',
    }, { crear: '1', utm: 'email' }, config);

    expect(query).toEqual({
      crear: '1',
      utm: 'email',
      search: 'ana',
      status: 'active',
    });
  });

  it('incluye página, límite y orden cuando no son defaults', () => {
    const query = buildListQuery({
      filters: { search: '', status: '' },
      page: 2,
      limit: 50,
      sortBy: 'created_at',
      sortDir: 'desc',
    }, { page: '9', limit: '10', sortBy: 'name', sortDir: 'asc' }, config);

    expect(query).toEqual({
      page: '2',
      limit: '50',
      sortBy: 'created_at',
      sortDir: 'desc',
    });
  });

  it('elimina solo las claves gestionadas al limpiar', () => {
    const empty = emptyListQueryState(config);
    const query = buildListQuery(empty, {
      search: 'ana',
      status: 'active',
      page: '2',
      limit: '50',
      sortBy: 'name',
      sortDir: 'desc',
      crear: '1',
    }, config);

    expect(query).toEqual({ crear: '1' });
  });

  it('compara queries sin depender del orden de las claves', () => {
    expect(isSameListQuery(
      { search: 'ana', page: '2' },
      { page: '2', search: 'ana' },
    )).toBe(true);
    expect(isSameListQuery({ search: 'ana' }, { search: 'ana ' })).toBe(false);
    expect(isSameListQuery({}, { search: 'ana' })).toBe(false);
  });
});
