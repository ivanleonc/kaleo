import { createAppColumnHelper, type AppColumnDef } from '@/composables/useAppTable';
import type { Member } from '@/types/member';

const memberColumnHelper = createAppColumnHelper<Member>();

/**
 * Modo servidor: el orden lo resuelve el backend (`sortBy`/`sortDir`).
 * `roles` no es sorteable — es un agregado que SQL no puede ordenar.
 */
export function useMemberColumns(): AppColumnDef<Member>[] {
  return [
    memberColumnHelper.accessor('name', { header: 'Nombre', meta: { label: 'Nombre' } }),
    memberColumnHelper.accessor('email', { header: 'Email', meta: { label: 'Email' } }),
    memberColumnHelper.accessor((m) => (m.roles ?? []).join(', '), {
      id: 'roles',
      header: 'Rol',
      enableSorting: false,
      meta: { label: 'Rol' },
    }),
    memberColumnHelper.accessor('status', { header: 'Estado', meta: { label: 'Estado' } }),
    memberColumnHelper.display({ id: 'actions', header: '', meta: { label: '', align: 'right' } }),
  ];
}
