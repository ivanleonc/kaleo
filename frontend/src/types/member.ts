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
