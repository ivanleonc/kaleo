export interface Branch {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  code?: string | null;
  is_main?: boolean;
  manager_user_id?: string | null;
  manager_name?: string | null;
  timezone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBranchPayload {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  code?: string;
  manager_user_id?: string;
  timezone?: string;
}

export interface UpdateBranchPayload {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
  code?: string;
  is_main?: boolean;
  manager_user_id?: string;
  timezone?: string;
}

export interface BranchesResponse {
  success: boolean;
  data: Branch[];
  total: number;
  page: number;
  limit: number;
}

export interface BranchResponse {
  success: boolean;
  message: string;
  data: Branch;
}
