export interface UpdateCompanyPayload {
  name?: string;
  tax_id?: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  timezone?: string;
  slug?: string | null;
}

export interface Company {
  id: string;
  name: string;
  tax_id: string | null;
  roles: string[];
}

export interface CompanyDetail {
  id: string;
  name: string;
  tax_id: string | null;
  is_active: boolean;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  timezone: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string;
}
