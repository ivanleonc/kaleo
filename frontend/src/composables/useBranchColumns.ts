import { createAppColumnHelper, type AppColumnDef } from '@/composables/useAppTable';
import type { Branch } from '@/types/branch';

const branchColumnHelper = createAppColumnHelper<Branch>();

/**
 * Modo servidor: el orden lo resuelve el backend (`sortBy`/`sortDir`).
 * Los ids coinciden con las claves del whitelist (`location`, `contact`…).
 */
export function useBranchColumns(): AppColumnDef<Branch>[] {
  return [
    branchColumnHelper.accessor('name', { header: 'Nombre', meta: { label: 'Nombre' } }),
    branchColumnHelper.accessor(
      (b) => [b.city, b.state, b.country].filter(Boolean).join(', '),
      { id: 'location', header: 'Ubicación', meta: { label: 'Ubicación' } },
    ),
    branchColumnHelper.accessor((b) => b.phone || b.email || '', {
      id: 'contact',
      header: 'Contacto',
      meta: { label: 'Contacto' },
    }),
    branchColumnHelper.accessor('is_active', {
      id: 'status',
      header: 'Estado',
      meta: { label: 'Estado' },
    }),
    branchColumnHelper.display({ id: 'actions', header: '', meta: { label: '', align: 'right' } }),
  ];
}
