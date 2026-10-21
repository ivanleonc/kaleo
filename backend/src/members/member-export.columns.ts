import type { ExportColumn } from '../common/export/export.types.js';

export interface MemberExportRow {
  id: string;
  name: string;
  email: string;
  roles: string[] | null;
  status: string;
}

export const MEMBER_EXPORT_COLUMNS: ExportColumn<MemberExportRow>[] = [
  {
    id: 'name',
    header: 'Nombre',
    width: 30,
    value: (row) => row.name,
  },
  {
    id: 'email',
    header: 'Email',
    width: 34,
    value: (row) => row.email,
  },
  {
    id: 'roles',
    header: 'Rol',
    width: 28,
    value: (row) => (row.roles ?? []).join(', '),
  },
  {
    id: 'status',
    header: 'Estado',
    width: 14,
    value: (row) => (row.status === 'active' ? 'Activo' : 'Inactivo'),
  },
];
