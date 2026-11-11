export type PartyType = 'person' | 'organization';
export type PartyStatus = 'active' | 'inactive';
export type PartyRole = 'customer' | 'supplier' | 'contractor' | 'employee' | 'contact';
export type PartyIdentityKind =
  | 'email'
  | 'phone'
  | 'whatsapp'
  | 'telegram'
  | 'web'
  | 'external';

export interface Party {
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

export interface PartyListItem extends Party {
  roles: PartyRole[];
  identities_count: number;
  contacts_count: number;
}

export interface PartyIdentity {
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

export interface PartyContact {
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

export interface PartyAddress {
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

export interface PartyDetail extends Party {
  roles: PartyRole[];
  identities: PartyIdentity[];
  contacts: PartyContact[];
  addresses: PartyAddress[];
}

export interface PartyListFilters {
  search?: string;
  partyType?: PartyType;
  role?: PartyRole;
  status?: PartyStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PartyIdentityInput {
  kind: PartyIdentityKind;
  value: string;
  isVerified?: boolean;
}

export interface CreatePartyPayload {
  partyType: PartyType;
  name: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  roles?: PartyRole[];
  identities?: PartyIdentityInput[];
}

export interface UpdatePartyPayload {
  partyType?: PartyType;
  name?: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: PartyStatus;
}

export interface PartyContactPayload {
  name: string;
  roleTitle?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface PartyAddressPayload {
  label?: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isPrimary?: boolean;
}
