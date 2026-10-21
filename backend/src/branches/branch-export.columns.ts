import type { ExportColumn } from '../common/export/export.types.js';
import type { BranchRow } from '../common/types/db-rows.js';

export const BRANCH_EXPORT_COLUMNS: ExportColumn<BranchRow>[] = [
  {
    id: 'name',
    header: 'Nombre',
    width: 30,
    value: (row) => {
      const suffixes = [
        row.code ? `(${row.code})` : '',
        row.is_main ? '(Principal)' : '',
      ].filter(Boolean);
      return suffixes.length > 0 ? `${row.name} ${suffixes.join(' ')}` : row.name;
    },
  },
  {
    id: 'location',
    header: 'Ubicación',
    width: 34,
    value: (row) => [row.city, row.state, row.country].filter(Boolean).join(', '),
  },
  {
    id: 'contact',
    header: 'Contacto',
    width: 34,
    value: (row) => {
      const contact = [row.phone, row.email].filter(Boolean).join(' · ');
      return row.manager_name
        ? [contact, `Resp: ${row.manager_name}`].filter(Boolean).join(' · ')
        : contact;
    },
  },
  {
    id: 'status',
    header: 'Estado',
    width: 14,
    value: (row) => (row.is_active ? 'Activa' : 'Inactiva'),
  },
];
