export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name?: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  must_change_password: boolean;
  email_verified: boolean;
  password_expired: boolean;
  phone?: string | null;
  avatar_url?: string | null;
  position?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  timezone?: string | null;
  locale?: string | null;
  pending_email?: string | null;
  tenants: Tenant[];
  roles: string[];
  permissions: string[];
}

export interface Tenant {
  id: string;
  name: string;
  tax_id: string | null;
  slug?: string | null;
  roles: string[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ProfileResponse {
  success: boolean;
  data: AuthUser;
}
