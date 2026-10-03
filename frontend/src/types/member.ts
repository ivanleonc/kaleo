export interface Member {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: 'active' | 'inactive';
  created_at: string;
  phone?: string | null;
  position?: string | null;
  avatar_url?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  must_change_password?: boolean;
}

export interface CreateMemberPayload {
  name: string;
  email: string;
  roleIds?: string[];
  phone?: string;
  position?: string;
  document_type?: string;
  document_number?: string;
}

export interface MembersResponse {
  success: boolean;
  data: Member[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateMemberResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    email: string;
    role_assigned: number;
    isNewUser?: boolean;
  };
}

export interface UpdateMemberPayload {
  roleIds?: string[];
  status?: 'active' | 'inactive';
  phone?: string;
  position?: string;
  document_type?: string;
  document_number?: string;
}

/** Payload para asignar un usuario a una empresa explícita. */
export interface AttachMemberPayload {
  userId?: string;
  email?: string;
  name?: string;
  roleIds?: string[];
  /** Alternativa a roleIds: se resuelven por nombre dentro de cada destino. */
  roleNames?: string[];
  phone?: string;
  position?: string;
}

/** Resultado de búsqueda de usuarios (sin datos sensibles). */
export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
}

/** Empresa (con roles) a la que pertenece un miembro. */
export interface MemberCompany {
  id: string;
  name: string;
  slug: string | null;
  roles: string[];
}
