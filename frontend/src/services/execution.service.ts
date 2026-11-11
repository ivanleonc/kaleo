import { apiClient } from '@/api/axios';
import type {
  Contract,
  ContractStatus,
  ContractType,
  PayrollEntry,
  PayrollStatus,
  PurchaseOrder,
  PurchaseOrderDetail,
  PurchaseOrderLinePayload,
  PurchaseOrderStatus,
  ScheduleActivity,
  ScheduleStatus,
  StockMovement,
  Warehouse,
} from '@/types/execution';

interface DataResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

function data<T>(response: { data: DataResponse<T> }): T {
  return response.data.data;
}

export const executionService = {
  // ─── Programación ─────────────────────────────────────────────────────────
  async listSchedule(projectId: string): Promise<ScheduleActivity[]> {
    const response = await apiClient.get<DataResponse<ScheduleActivity[]>>(
      `/projects/${projectId}/schedule`,
    );
    return data(response);
  },

  async createScheduleActivity(
    projectId: string,
    payload: {
      name: string;
      startDate?: string | null;
      endDate?: string | null;
      progressPct?: number;
      predecessorId?: string | null;
      budgetItemId?: string | null;
      status?: ScheduleStatus;
      notes?: string | null;
    },
  ): Promise<ScheduleActivity> {
    const response = await apiClient.post<DataResponse<ScheduleActivity>>(
      `/projects/${projectId}/schedule`,
      payload,
    );
    return data(response);
  },

  async updateScheduleActivity(
    id: string,
    payload: Partial<{
      name: string;
      startDate: string | null;
      endDate: string | null;
      progressPct: number;
      predecessorId: string | null;
      budgetItemId: string | null;
      status: ScheduleStatus;
      notes: string | null;
    }>,
  ): Promise<ScheduleActivity> {
    const response = await apiClient.patch<DataResponse<ScheduleActivity>>(
      `/schedule/${id}`,
      payload,
    );
    return data(response);
  },

  async deleteScheduleActivity(id: string): Promise<void> {
    await apiClient.delete(`/schedule/${id}`);
  },

  // ─── Contratos ────────────────────────────────────────────────────────────
  async listContracts(projectId: string): Promise<Contract[]> {
    const response = await apiClient.get<DataResponse<Contract[]>>(
      `/projects/${projectId}/contracts`,
    );
    return data(response);
  },

  async createContract(
    projectId: string,
    payload: {
      code: string;
      name: string;
      contractType?: ContractType;
      partyId?: string | null;
      amount?: number;
      currencyCode: string;
      startDate?: string | null;
      endDate?: string | null;
      status?: ContractStatus;
      notes?: string | null;
    },
  ): Promise<Contract> {
    const response = await apiClient.post<DataResponse<Contract>>(
      `/projects/${projectId}/contracts`,
      payload,
    );
    return data(response);
  },

  async updateContract(
    id: string,
    payload: Partial<{
      code: string;
      name: string;
      contractType: ContractType;
      partyId: string | null;
      amount: number;
      startDate: string | null;
      endDate: string | null;
      status: ContractStatus;
      notes: string | null;
    }>,
  ): Promise<Contract> {
    const response = await apiClient.patch<DataResponse<Contract>>(`/contracts/${id}`, payload);
    return data(response);
  },

  async deleteContract(id: string): Promise<void> {
    await apiClient.delete(`/contracts/${id}`);
  },

  // ─── Nómina ───────────────────────────────────────────────────────────────
  async listPayroll(projectId: string): Promise<PayrollEntry[]> {
    const response = await apiClient.get<DataResponse<PayrollEntry[]>>(
      `/projects/${projectId}/payroll`,
    );
    return data(response);
  },

  async createPayrollEntry(
    projectId: string,
    payload: {
      workerName: string;
      membershipId?: string | null;
      periodStart: string;
      periodEnd: string;
      days?: number;
      amount?: number;
      currencyCode: string;
      status?: PayrollStatus;
      notes?: string | null;
    },
  ): Promise<PayrollEntry> {
    const response = await apiClient.post<DataResponse<PayrollEntry>>(
      `/projects/${projectId}/payroll`,
      payload,
    );
    return data(response);
  },

  async updatePayrollEntry(
    id: string,
    payload: Partial<{
      workerName: string;
      membershipId: string | null;
      periodStart: string;
      periodEnd: string;
      days: number;
      amount: number;
      status: PayrollStatus;
      notes: string | null;
    }>,
  ): Promise<PayrollEntry> {
    const response = await apiClient.patch<DataResponse<PayrollEntry>>(`/payroll/${id}`, payload);
    return data(response);
  },

  async deletePayrollEntry(id: string): Promise<void> {
    await apiClient.delete(`/payroll/${id}`);
  },

  // ─── Almacén ──────────────────────────────────────────────────────────────
  async listWarehouses(projectId?: string): Promise<Warehouse[]> {
    const response = await apiClient.get<DataResponse<Warehouse[]>>('/warehouses', {
      params: { projectId: projectId || undefined },
    });
    return data(response);
  },

  async createWarehouse(payload: {
    code: string;
    name: string;
    projectId?: string | null;
    location?: string | null;
    isActive?: boolean;
  }): Promise<Warehouse> {
    const response = await apiClient.post<DataResponse<Warehouse>>('/warehouses', payload);
    return data(response);
  },

  async updateWarehouse(
    id: string,
    payload: Partial<{
      code: string;
      name: string;
      projectId: string | null;
      location: string | null;
      isActive: boolean;
    }>,
  ): Promise<Warehouse> {
    const response = await apiClient.patch<DataResponse<Warehouse>>(`/warehouses/${id}`, payload);
    return data(response);
  },

  async deleteWarehouse(id: string): Promise<void> {
    await apiClient.delete(`/warehouses/${id}`);
  },

  async listMovements(warehouseId: string): Promise<StockMovement[]> {
    const response = await apiClient.get<DataResponse<StockMovement[]>>(
      `/warehouses/${warehouseId}/movements`,
    );
    return data(response);
  },

  async createMovement(
    warehouseId: string,
    payload: {
      resourceId: string;
      movementType: 'in' | 'out' | 'adjustment';
      quantity: number;
      unitCost?: number;
      occurredAt?: string | null;
      reference?: string | null;
      notes?: string | null;
    },
  ): Promise<StockMovement> {
    const response = await apiClient.post<DataResponse<StockMovement>>(
      `/warehouses/${warehouseId}/movements`,
      payload,
    );
    return data(response);
  },

  async deleteMovement(id: string): Promise<void> {
    await apiClient.delete(`/stock-movements/${id}`);
  },

  // ─── Compras ──────────────────────────────────────────────────────────────
  async listPurchaseOrders(projectId: string): Promise<PurchaseOrder[]> {
    const response = await apiClient.get<DataResponse<PurchaseOrder[]>>(
      `/projects/${projectId}/purchase-orders`,
    );
    return data(response);
  },

  async getPurchaseOrder(id: string): Promise<PurchaseOrderDetail> {
    const response = await apiClient.get<DataResponse<PurchaseOrderDetail>>(
      `/purchase-orders/${id}`,
    );
    return data(response);
  },

  async createPurchaseOrder(
    projectId: string,
    payload: {
      code: string;
      supplierPartyId?: string | null;
      currencyCode: string;
      status?: PurchaseOrderStatus;
      notes?: string | null;
      lines: PurchaseOrderLinePayload[];
    },
  ): Promise<PurchaseOrderDetail> {
    const response = await apiClient.post<DataResponse<PurchaseOrderDetail>>(
      `/projects/${projectId}/purchase-orders`,
      payload,
    );
    return data(response);
  },

  async updatePurchaseOrder(
    id: string,
    payload: Partial<{
      supplierPartyId: string | null;
      code: string;
      status: PurchaseOrderStatus;
      notes: string | null;
    }>,
  ): Promise<PurchaseOrderDetail> {
    const response = await apiClient.patch<DataResponse<PurchaseOrderDetail>>(
      `/purchase-orders/${id}`,
      payload,
    );
    return data(response);
  },

  async deletePurchaseOrder(id: string): Promise<void> {
    await apiClient.delete(`/purchase-orders/${id}`);
  },
};
