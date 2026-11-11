export const PARTY_TYPES = ['person', 'organization'] as const;
export const PARTY_STATUSES = ['active', 'inactive'] as const;
export const PARTY_ROLES = [
  'customer',
  'supplier',
  'contractor',
  'employee',
  'contact',
] as const;
export const PARTY_IDENTITY_KINDS = [
  'email',
  'phone',
  'whatsapp',
  'telegram',
  'web',
  'external',
] as const;

export type PartyType = (typeof PARTY_TYPES)[number];
export type PartyStatus = (typeof PARTY_STATUSES)[number];
export type PartyRole = (typeof PARTY_ROLES)[number];
export type PartyIdentityKind = (typeof PARTY_IDENTITY_KINDS)[number];

export interface PartyRow {
  id: string;
  company_id: string;
  party_type: PartyType;
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  status: PartyStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PartyListItem extends PartyRow {
  roles: PartyRole[];
  identities_count: number;
  contacts_count: number;
}

export interface PartyIdentityRow {
  id: string;
  company_id: string;
  party_id: string;
  kind: PartyIdentityKind;
  value: string;
  normalized_value: string;
  is_verified: boolean;
  source_module: string;
  created_at: string;
}

export interface PartyRoleRow {
  company_id: string;
  party_id: string;
  role: PartyRole;
  created_at: string;
}

export interface PartyContactRow {
  id: string;
  company_id: string;
  party_id: string;
  name: string;
  role_title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartyAddressRow {
  id: string;
  company_id: string;
  party_id: string;
  label: string | null;
  address: string;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartyDetail extends PartyRow {
  roles: PartyRole[];
  identities: PartyIdentityRow[];
  contacts: PartyContactRow[];
  addresses: PartyAddressRow[];
}

export interface PartyListFilters {
  search?: string;
  partyType?: PartyType;
  role?: PartyRole;
  status?: PartyStatus;
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PartyIdentityInput {
  kind: PartyIdentityKind;
  value: string;
  isVerified?: boolean;
}

export interface CreatePartyInput {
  partyType: PartyType;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  roles?: PartyRole[];
  identities?: PartyIdentityInput[];
}

export interface UpdatePartyInput {
  partyType?: PartyType;
  name?: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: PartyStatus;
}

export interface PartyContactInput {
  name: string;
  roleTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary?: boolean;
}

export interface PartyAddressInput {
  label?: string | null;
  address: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  isPrimary?: boolean;
}
