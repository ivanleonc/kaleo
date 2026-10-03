import { defineStore } from 'pinia';
import { ref } from 'vue';
import { memberService } from '@/services/member.service';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useAsyncOperation } from '@/composables/useAsyncOperation';
import { usePaginatedSetup } from '@/composables/createPaginatedStore';
import type { Member, CreateMemberPayload, UpdateMemberPayload, AttachMemberPayload, MemberCompany, UserSearchResult } from '@/types/member';

export interface MemberFilters extends Record<string, unknown> {
  search?: string;
  status?: string;
  roleId?: string;
}

export const useMemberStore = defineStore('member', () => {
  const { companyId } = useCompanyPath();

  // ---------------------------------------------------------------------------
  // Paginación base (paginación, filtros, sort, reset por empresa)
  // ---------------------------------------------------------------------------
  const paginated = usePaginatedSetup<Member, MemberFilters>({
    fetchFn: memberService.getMembers.bind(memberService),
    defaultFilters: { search: undefined, status: undefined, roleId: undefined },
  });

  // Alias de compatibilidad: las views usan `memberStore.members` y
  // `memberStore.fetchMembers()` — no hay que tocar ningún consumidor.
  // `paginated.items` es un Ref<Member[]>: al incluirlo en el return con
  // el nombre `members`, Pinia lo desenvuelve igual que cualquier otro ref.
  const members = paginated.items;
  const fetchMembers = (targetPage?: number) => paginated.fetch(targetPage);

  // ---------------------------------------------------------------------------
  // CRUD de dominio
  // ---------------------------------------------------------------------------

  const addMember = async (payload: CreateMemberPayload) => {
    if (!companyId.value) throw new Error('No hay una empresa activa seleccionada');
    const result = await paginated.withLoading(async () => {
      const response = await memberService.addMember(payload);
      await paginated.refresh();
      return response.data;
    }, 'Error al agregar el miembro');
    return result;
  };

  const updateMember = async (userId: string, payload: UpdateMemberPayload) => {
    if (!companyId.value) return;
    await paginated.withLoading(async () => {
      await memberService.updateMember(userId, payload);
      await paginated.refresh();
    }, 'Error al actualizar el miembro');
  };

  const removeMember = async (userId: string) => {
    if (!companyId.value) return;
    await paginated.withLoading(async () => {
      await memberService.removeMember(userId);
      await paginated.refresh();
    }, 'Error al eliminar el miembro');
  };

  const resetPassword = async (userId: string) => {
    if (!companyId.value) throw new Error('No hay una empresa activa seleccionada');
    const result = await paginated.withLoading(async () => {
      const response = await memberService.resetPassword(userId);
      return response.data;
    }, 'Error al resetear la contraseña');
    return result;
  };

  const resetPasswordAndSendEmail = async (userId: string) => {
    if (!companyId.value) throw new Error('No hay una empresa activa seleccionada');
    const result = await paginated.withLoading(async () => {
      const response = await memberService.resetPasswordAndSendEmail(userId);
      return response.data;
    }, 'Error al resetear y enviar contraseña');
    return result;
  };

  // ---------------------------------------------------------------------------
  // Operaciones multi-empresa
  // ---------------------------------------------------------------------------

  /** Empresas (con roles) a las que pertenece un miembro. */
  const memberCompanies = ref<MemberCompany[]>([]);

  const fetchUserCompanies = async (userId: string) => {
    const result = await paginated.withLoading(async () => {
      const response = await memberService.getUserCompanies(userId);
      memberCompanies.value = response.data;
      return response.data;
    }, 'Error al cargar las empresas del miembro');
    return result ?? [];
  };

  /**
   * Asigna un usuario a una empresa explícita (puede diferir de la activa).
   * Si es la empresa activa se refresca la tabla; si no, no hay nada local
   * que refrescar.
   */
  const attachMemberToCompany = async (targetCompanyId: string, payload: AttachMemberPayload) => {
    const result = await paginated.withLoading(async () => {
      const response = await memberService.attachToCompany(targetCompanyId, payload);
      if (targetCompanyId === companyId.value) {
        await paginated.refresh();
      }
      return response.data;
    }, 'Error al asignar la empresa');
    return result;
  };

  const detachMemberFromCompany = async (targetCompanyId: string, userId: string) => {
    await paginated.withLoading(async () => {
      await memberService.removeFromCompany(targetCompanyId, userId);
      memberCompanies.value = memberCompanies.value.filter((c) => c.id !== targetCompanyId);
      if (targetCompanyId === companyId.value) {
        await paginated.refresh();
      }
    }, 'Error al quitar la empresa');
  };

  const searchUsers = async (query: string): Promise<UserSearchResult[]> => {
    const response = await memberService.searchUsers(query);
    return response.data;
  };

  return {
    // --- Paginación base ---
    ...paginated,
    // --- Alias de compatibilidad ---
    members,
    fetchMembers,
    // --- CRUD de dominio ---
    addMember,
    updateMember,
    removeMember,
    resetPassword,
    resetPasswordAndSendEmail,
    // --- Multi-empresa ---
    memberCompanies,
    fetchUserCompanies,
    attachMemberToCompany,
    detachMemberFromCompany,
    searchUsers,
  };
});
