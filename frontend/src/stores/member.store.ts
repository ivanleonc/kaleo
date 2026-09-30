import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { memberService } from '@/services/member.service';
import { useCompanyPath } from '@/composables/useCompanyPath';
import { useAsyncOperation } from '@/composables/useAsyncOperation';
import type { ServerSort } from '@/composables/useAppTable';
import type { Member, CreateMemberPayload, UpdateMemberPayload } from '@/types/member';

export interface MemberFilters {
  search?: string;
  status?: string;
  roleId?: string;
}

export const useMemberStore = defineStore('member', () => {
  const { companyId } = useCompanyPath();

  const members = ref<Member[]>([]);

  const {
    isLoading,
    error,
    execute: withLoading,
  } = useAsyncOperation({ errorMessage: 'Error en la operación' });

  const page = ref(1);
  const limit = ref(20);
  const total = ref(0);
  const filters = ref<MemberFilters>({});
  const sortBy = ref<string | undefined>(undefined);
  const sortDir = ref<'asc' | 'desc'>('asc');

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));
  const hasPrev = computed(() => page.value > 1);
  const hasNext = computed(() => page.value < totalPages.value);

  const currentCompanyId = computed(() => companyId.value);

  const fetchMembers = async (targetPage = page.value) => {
    if (!currentCompanyId.value) return;
    await withLoading(async () => {
      const response = await memberService.getMembers({
        page: targetPage,
        limit: limit.value,
        ...filters.value,
        ...(sortBy.value ? { sortBy: sortBy.value, sortDir: sortDir.value } : {}),
      });
      members.value = response.data;
      total.value = response.total;
      page.value = response.page;
      limit.value = response.limit;
    }, 'Error al cargar los miembros');
  };

  const goToPage = async (targetPage: number) => {
    const clamped = Math.min(Math.max(1, targetPage), totalPages.value);
    if (clamped === page.value) return;
    await fetchMembers(clamped);
  };

  const setLimit = async (newLimit: number) => {
    limit.value = newLimit;
    await fetchMembers(1);
  };

  /** Aplica filtros en el servidor y vuelve a la primera página. */
  const applyFilters = async (next: MemberFilters) => {
    filters.value = next;
    await fetchMembers(1);
  };

  const clearFilters = async () => {
    filters.value = {};
    await fetchMembers(1);
  };

  /** Orden server-side: cambia el sort y vuelve a la primera página. */
  const setSort = async (sort: ServerSort) => {
    sortBy.value = sort.sortBy;
    sortDir.value = sort.sortDir ?? 'asc';
    await fetchMembers(1);
  };

  /** Tras agregar/eliminar, vuelve a la primera página si la actual quedó vacía. */
  const refreshMembers = async () => {
    await fetchMembers(page.value > totalPages.value ? 1 : page.value);
  };

  const addMember = async (payload: CreateMemberPayload) => {
    if (!currentCompanyId.value) throw new Error('No hay una empresa activa seleccionada');
    const result = await withLoading(async () => {
      const response = await memberService.addMember(payload);
      await refreshMembers();
      return response.data;
    }, 'Error al agregar el miembro');
    return result;
  };

  const updateMember = async (userId: string, payload: UpdateMemberPayload) => {
    if (!currentCompanyId.value) return;
    await withLoading(async () => {
      await memberService.updateMember(userId, payload);
      await refreshMembers();
    }, 'Error al actualizar el miembro');
  };

  const removeMember = async (userId: string) => {
    if (!currentCompanyId.value) return;
    await withLoading(async () => {
      await memberService.removeMember(userId);
      await refreshMembers();
    }, 'Error al eliminar el miembro');
  };

  const resetPassword = async (userId: string) => {
    if (!currentCompanyId.value) throw new Error('No hay una empresa activa seleccionada');
    const result = await withLoading(async () => {
      const response = await memberService.resetPassword(userId);
      return response.data;
    }, 'Error al resetear la contraseña');
    return result;
  };

  const resetPasswordAndSendEmail = async (userId: string) => {
    if (!currentCompanyId.value) throw new Error('No hay una empresa activa seleccionada');
    const result = await withLoading(async () => {
      const response = await memberService.resetPasswordAndSendEmail(userId);
      return response.data;
    }, 'Error al resetear y enviar contraseña');
    return result;
  };

  return {
    members,
    isLoading,
    error,
    page,
    limit,
    total,
    totalPages,
    hasPrev,
    hasNext,
    filters,
    sortBy,
    sortDir,
    fetchMembers,
    goToPage,
    setLimit,
    applyFilters,
    clearFilters,
    setSort,
    addMember,
    updateMember,
    removeMember,
    resetPassword,
    resetPasswordAndSendEmail,
  };
});
