import type {
  LocationQuery,
  LocationQueryRaw,
  LocationQueryValue,
  LocationQueryValueRaw,
} from 'vue-router';

export type ListSortDir = 'asc' | 'desc';

export interface ListQueryState {
  filters: Record<string, string>;
  page: number;
  limit: number;
  sortBy: string;
  sortDir: ListSortDir;
}

export interface ListQueryConfig {
  filterKeys?: readonly string[];
  allowedFilters?: Record<string, readonly string[]>;
  defaultLimit?: number;
  allowedLimits?: readonly number[];
  sortable?: readonly string[];
  defaultSortDir?: ListSortDir;
}

const PAGE_KEY = 'page';
const LIMIT_KEY = 'limit';
const SORT_BY_KEY = 'sortBy';
const SORT_DIR_KEY = 'sortDir';

function firstValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

function queryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  return firstValue(value);
}

function positiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function filterKeysOf(config: ListQueryConfig): readonly string[] {
  return config.filterKeys ?? [];
}

export function parseListQuery(
  query: LocationQuery,
  config: ListQueryConfig = {},
): ListQueryState {
  const defaultLimit = config.defaultLimit ?? 20;
  const filters: Record<string, string> = {};

  for (const key of filterKeysOf(config)) {
    let value = queryValue(query[key]);
    const allowed = config.allowedFilters?.[key];
    if (allowed && !allowed.includes(value)) value = '';
    filters[key] = value;
  }

  const requestedLimit = positiveInt(queryValue(query[LIMIT_KEY]), defaultLimit);
  const limit = config.allowedLimits && !config.allowedLimits.includes(requestedLimit)
    ? defaultLimit
    : requestedLimit;

  const requestedSort = queryValue(query[SORT_BY_KEY]);
  const sortBy = config.sortable && !config.sortable.includes(requestedSort)
    ? ''
    : requestedSort;

  return {
    filters,
    page: positiveInt(queryValue(query[PAGE_KEY]), 1),
    limit,
    sortBy,
    sortDir: queryValue(query[SORT_DIR_KEY]) === 'desc' ? 'desc' : (config.defaultSortDir ?? 'asc'),
  };
}

export function emptyListQueryState(config: ListQueryConfig = {}): ListQueryState {
  return {
    filters: Object.fromEntries(filterKeysOf(config).map((key) => [key, ''])),
    page: 1,
    limit: config.defaultLimit ?? 20,
    sortBy: '',
    sortDir: config.defaultSortDir ?? 'asc',
  };
}

export function buildListQuery(
  state: ListQueryState,
  currentQuery: LocationQueryRaw = {},
  config: ListQueryConfig = {},
): LocationQueryRaw {
  const query: LocationQueryRaw = { ...currentQuery };
  const defaultLimit = config.defaultLimit ?? 20;

  for (const key of filterKeysOf(config)) {
    delete query[key];
  }
  delete query[PAGE_KEY];
  delete query[LIMIT_KEY];
  delete query[SORT_BY_KEY];
  delete query[SORT_DIR_KEY];

  for (const [key, value] of Object.entries(state.filters)) {
    if (value !== '') query[key] = value;
  }

  if (state.page > 1) query[PAGE_KEY] = String(state.page);
  if (state.limit !== defaultLimit) query[LIMIT_KEY] = String(state.limit);
  if (state.sortBy) {
    query[SORT_BY_KEY] = state.sortBy;
    query[SORT_DIR_KEY] = state.sortDir;
  }

  return query;
}

function normalizedValue(value: LocationQueryValueRaw | LocationQueryValueRaw[] | undefined): string {
  if (Array.isArray(value)) return value.map((item) => item ?? '').join('\u0000');
  return value === null || value === undefined ? '' : String(value);
}

export function isSameListQuery(a: LocationQueryRaw, b: LocationQueryRaw): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (normalizedValue(a[key]) !== normalizedValue(b[key])) return false;
  }
  return true;
}
