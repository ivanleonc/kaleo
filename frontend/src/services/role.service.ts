import { apiClient } from '@/api/axios';
import type { Permission, Role, RolePayload } from '@/types/role';

export type { Permission, Role, RolePayload };

export const roleService = {
  async getAllPermissions(): Promise<Permission[]> {
    const response = await apiClient.get('/permissions');
    return response.data.data;
  },

  async getRoles(companyId?: string): Promise<Role[]> {
    // Header explícito para listar roles de otra empresa (ej. asignar un
    // miembro a varias empresas sin cambiar el tenant activo).
    const config = companyId ? { headers: { 'x-company-id': companyId } } : undefined;
    const response = await apiClient.get('/roles', config);
    return response.data.data;
  },

  async getRoleById(id: string): Promise<Role> {
    const response = await apiClient.get(`/roles/${id}`);
    return response.data.data;
  },

  async createRole(payload: { name: string; description?: string; color?: string; permissionIds?: string[] }) {
    const response = await apiClient.post('/roles', payload);
    return response.data;
  },

  async updateRolePermissions(roleId: string, permissionIds: number[]) {
    const response = await apiClient.put(`/roles/${roleId}/permissions`, { permissionIds });
    return response.data;
  },

  async updateRole(roleId: string, data: RolePayload) {
    const response = await apiClient.put(`/roles/${roleId}`, data);
    return response.data;
  },

  async deleteRole(roleId: string) {
    const response = await apiClient.delete(`/roles/${roleId}`);
    return response.data;
  },
};
