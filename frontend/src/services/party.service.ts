import { apiClient } from '@/api/axios';
import type {
  CreatePartyPayload,
  PartyAddress,
  PartyAddressPayload,
  PartyContact,
  PartyContactPayload,
  PartyDetail,
  PartyIdentity,
  PartyIdentityInput,
  PartyListItem,
  PartyListFilters,
  PartyRole,
  UpdatePartyPayload,
} from '@/types/party';

export interface PartyListResponse {
  success: boolean;
  data: PartyListItem[];
  total: number;
  page: number;
  limit: number;
}

interface PartyResponse {
  success: boolean;
  message?: string;
  data: PartyDetail;
}

export const partyService = {
  async list(filters: PartyListFilters = {}): Promise<PartyListResponse> {
    const response = await apiClient.get<PartyListResponse>('/parties', {
      params: {
        search: filters.search || undefined,
        partyType: filters.partyType || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
        page: filters.page,
        limit: filters.limit,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
      },
    });
    return response.data;
  },

  async get(id: string): Promise<PartyResponse> {
    const response = await apiClient.get<PartyResponse>(`/parties/${id}`);
    return response.data;
  },

  async create(payload: CreatePartyPayload): Promise<PartyResponse> {
    const response = await apiClient.post<PartyResponse>('/parties', payload);
    return response.data;
  },

  async update(id: string, payload: UpdatePartyPayload): Promise<PartyResponse> {
    const response = await apiClient.patch<PartyResponse>(`/parties/${id}`, payload);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/parties/${id}`);
  },

  async addRole(id: string, role: PartyRole): Promise<void> {
    await apiClient.post(`/parties/${id}/roles`, { role });
  },

  async removeRole(id: string, role: PartyRole): Promise<void> {
    await apiClient.delete(`/parties/${id}/roles/${role}`);
  },

  async addIdentity(id: string, payload: PartyIdentityInput): Promise<PartyIdentity> {
    const response = await apiClient.post<{ success: boolean; data: PartyIdentity }>(
      `/parties/${id}/identities`,
      payload,
    );
    return response.data.data;
  },

  async removeIdentity(id: string, identityId: string): Promise<void> {
    await apiClient.delete(`/parties/${id}/identities/${identityId}`);
  },

  async addContact(id: string, payload: PartyContactPayload): Promise<PartyContact> {
    const response = await apiClient.post<{ success: boolean; data: PartyContact }>(
      `/parties/${id}/contacts`,
      payload,
    );
    return response.data.data;
  },

  async updateContact(
    id: string,
    contactId: string,
    payload: Partial<PartyContactPayload>,
  ): Promise<PartyContact> {
    const response = await apiClient.patch<{ success: boolean; data: PartyContact }>(
      `/parties/${id}/contacts/${contactId}`,
      payload,
    );
    return response.data.data;
  },

  async removeContact(id: string, contactId: string): Promise<void> {
    await apiClient.delete(`/parties/${id}/contacts/${contactId}`);
  },

  async addAddress(id: string, payload: PartyAddressPayload): Promise<PartyAddress> {
    const response = await apiClient.post<{ success: boolean; data: PartyAddress }>(
      `/parties/${id}/addresses`,
      payload,
    );
    return response.data.data;
  },

  async updateAddress(
    id: string,
    addressId: string,
    payload: Partial<PartyAddressPayload>,
  ): Promise<PartyAddress> {
    const response = await apiClient.patch<{ success: boolean; data: PartyAddress }>(
      `/parties/${id}/addresses/${addressId}`,
      payload,
    );
    return response.data.data;
  },

  async removeAddress(id: string, addressId: string): Promise<void> {
    await apiClient.delete(`/parties/${id}/addresses/${addressId}`);
  },
};
