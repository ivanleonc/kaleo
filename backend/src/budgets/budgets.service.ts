import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BudgetsRepository } from './budgets.repository.js';
import { ProjectsService } from '../projects/projects.service.js';
import { EstimatingService } from '../estimating/estimating.service.js';
import { EntitlementService } from '../kernel/billing/entitlement.service.js';
import type {
  AddApusInput,
  BudgetDetail,
  BudgetItemRow,
  BudgetRow,
  CreateBudgetItemInput,
  UpdateBudgetItemInput,
} from './budgets.types.js';

const PROJECTS_MODULE_CODE = 'construction.projects';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly repository: BudgetsRepository,
    private readonly projects: ProjectsService,
    private readonly estimating: EstimatingService,
    private readonly entitlements: EntitlementService,
  ) {}

  async getByProject(companyId: string, projectId: string): Promise<BudgetDetail | null> {
    await this.projects.get(companyId, projectId);
    const budget = await this.repository.findByProject(companyId, projectId);
    if (!budget) return null;
    return this.repository.getDetail(companyId, budget.id);
  }

  async createBudget(
    companyId: string,
    userId: string,
    projectId: string,
    apuBaseId?: string | null,
  ): Promise<BudgetDetail> {
    await this.assertWritable(companyId);
    const project = await this.projects.get(companyId, projectId);
    const existing = await this.repository.findByProject(companyId, projectId);
    if (existing) throw new ConflictException('El proyecto ya tiene un presupuesto');
    if (apuBaseId) {
      const bases = await this.estimating.listApuBases(companyId);
      if (!bases.some((base) => base.id === apuBaseId)) {
        throw new BadRequestException('La base de APUs no existe');
      }
    }
    return this.repository.create(companyId, userId, projectId, {
      code: `PRES-${project.code}`,
      name: `Presupuesto ${project.name}`,
      currencyCode: project.currency_code,
      apuBaseId,
    });
  }

  async updateBudget(
    companyId: string,
    id: string,
    input: { name?: string; indirectPct?: number; indirectFixed?: number },
  ): Promise<BudgetDetail> {
    await this.assertWritable(companyId);
    const budget = await this.getBudget(companyId, id);
    if (budget.status === 'approved') {
      throw new BadRequestException('El presupuesto aprobado está bloqueado');
    }
    if (input.indirectPct !== undefined && input.indirectPct < 0) {
      throw new BadRequestException('El porcentaje indirecto no puede ser negativo');
    }
    if (input.indirectFixed !== undefined && input.indirectFixed < 0) {
      throw new BadRequestException('El indirecto fijo no puede ser negativo');
    }
    await this.repository.update(companyId, id, input);
    await this.recalculate(companyId, id);
    return this.getBudget(companyId, id);
  }

  async addItem(
    companyId: string,
    budgetId: string,
    input: CreateBudgetItemInput,
  ): Promise<BudgetDetail> {
    await this.assertWritable(companyId);
    const budget = await this.getBudget(companyId, budgetId);
    this.assertEditable(budget);
    const items = budget.items;
    const parent = input.parentId
      ? items.find((item) => item.id === input.parentId)
      : null;
    if (input.parentId && (!parent || parent.item_type !== 'chapter')) {
      throw new BadRequestException('El padre debe ser un capítulo');
    }
    if (input.itemType === 'activity' && !input.unitId) {
      throw new BadRequestException('La actividad requiere una unidad');
    }
    if (input.unitId && !(await this.repository.unitExists(companyId, input.unitId))) {
      throw new BadRequestException('La unidad no existe');
    }
    if (input.assignedMembershipId && !(await this.repository.membershipExists(companyId, input.assignedMembershipId))) {
      throw new BadRequestException('El responsable no es miembro activo');
    }
    const code = input.code?.trim() || this.nextCode(items, input.parentId ?? null, input.itemType);
    if (items.some((item) => item.code === code)) {
      throw new ConflictException('Ya existe una actividad con ese código');
    }
    await this.repository.createItem(companyId, budgetId, {
      ...input,
      code,
      unitPrice: input.unitPrice ?? 0,
      quantity: input.quantity ?? 0,
    });
    await this.recalculate(companyId, budgetId);
    return this.getBudget(companyId, budgetId);
  }

  async updateItem(
    companyId: string,
    budgetId: string,
    itemId: string,
    input: UpdateBudgetItemInput,
  ): Promise<BudgetDetail> {
    await this.assertWritable(companyId);
    const budget = await this.getBudget(companyId, budgetId);
    this.assertEditable(budget);
    const item = budget.items.find((entry) => entry.id === itemId);
    if (!item) throw new NotFoundException('Actividad no encontrada');
    if (input.quantity !== undefined && input.quantity < 0) {
      throw new BadRequestException('La cantidad no puede ser negativa');
    }
    if (input.unitPrice !== undefined && input.unitPrice < 0) {
      throw new BadRequestException('El valor unitario no puede ser negativo');
    }
    if (input.assignedMembershipId && !(await this.repository.membershipExists(companyId, input.assignedMembershipId))) {
      throw new BadRequestException('El responsable no es miembro activo');
    }
    const updated = await this.repository.updateItem(companyId, budgetId, itemId, input);
    if (!updated) throw new NotFoundException('Actividad no encontrada');
    await this.recalculate(companyId, budgetId);
    return this.getBudget(companyId, budgetId);
  }

  async deleteItem(
    companyId: string,
    budgetId: string,
    itemId: string,
  ): Promise<BudgetDetail> {
    await this.assertWritable(companyId);
    const budget = await this.getBudget(companyId, budgetId);
    this.assertEditable(budget);
    const deleted = await this.repository.deleteItem(companyId, budgetId, itemId);
    if (!deleted) throw new NotFoundException('Actividad no encontrada');
    await this.recalculate(companyId, budgetId);
    return this.getBudget(companyId, budgetId);
  }

  async addFromApus(
    companyId: string,
    budgetId: string,
    input: AddApusInput,
  ): Promise<BudgetDetail> {
    await this.assertWritable(companyId);
    const budget = await this.getBudget(companyId, budgetId);
    this.assertEditable(budget);
    const parent = input.parentId
      ? budget.items.find((item) => item.id === input.parentId)
      : null;
    if (input.parentId && (!parent || parent.item_type !== 'chapter')) {
      throw new BadRequestException('El padre debe ser un capítulo');
    }

    const items = [...budget.items];
    for (const apuId of input.apuIds) {
      const apu = await this.estimating.getApu(companyId, apuId);
      if (!apu.unit_id) continue;
      let code = apu.code;
      let suffix = 2;
      while (items.some((item) => item.code === code)) {
        code = `${apu.code}-${suffix++}`;
      }
      const childCount = items.filter((item) => item.parent_id === (input.parentId ?? null)).length;
      const created = await this.repository.createItem(companyId, budgetId, {
        parentId: input.parentId ?? null,
        code,
        name: apu.name,
        itemType: 'activity',
        unitId: apu.unit_id,
        quantity: 0,
        unitPrice: apu.unit_cost,
        apuId: apu.id,
        apuVersionId: apu.current_version_id,
        sortOrder: childCount,
      });
      items.push(created);
    }

    await this.recalculate(companyId, budgetId);
    return this.getBudget(companyId, budgetId);
  }

  async calculateBudget(companyId: string, id: string): Promise<BudgetDetail> {
    await this.assertWritable(companyId);
    await this.getBudget(companyId, id);
    await this.recalculate(companyId, id);
    return this.getBudget(companyId, id);
  }

  async approveBudget(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<BudgetDetail> {
    await this.assertWritable(companyId);
    const budget = await this.getBudget(companyId, id);
    this.assertEditable(budget);
    await this.recalculate(companyId, id);
    const calculated = await this.getBudget(companyId, id);
    await this.repository.update(companyId, id, {
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
    });
    await this.repository.insertApproval(companyId, id, userId, {
      budget: {
        id: calculated.id,
        code: calculated.code,
        total: calculated.total,
        subtotal: calculated.subtotal,
        indirectTotal: calculated.indirect_total,
        indirectPct: calculated.indirect_pct,
        indirectFixed: calculated.indirect_fixed,
      },
      items: calculated.items,
    });
    return this.getBudget(companyId, id);
  }

  private async recalculate(companyId: string, budgetId: string): Promise<void> {
    const budget = await this.repository.findById(companyId, budgetId);
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');
    const items = await this.repository.listItems(companyId, budgetId);
    const byId = new Map(items.map((item) => [item.id, { ...item }]));
    const depth = (item: BudgetItemRow): number => item.code.split('.').length;

    for (const item of [...byId.values()].sort((a, b) => depth(b) - depth(a))) {
      if (item.item_type === 'activity') {
        item.partial_amount = money(item.quantity * item.unit_price);
      } else {
        const childTotal = [...byId.values()]
          .filter((child) => child.parent_id === item.id)
          .reduce((sum, child) => sum + child.partial_amount, 0);
        item.partial_amount = money(childTotal);
      }
    }

    const direct = money(
      [...byId.values()]
        .filter((item) => item.item_type === 'activity')
        .reduce((sum, item) => sum + item.partial_amount, 0),
    );
    const indirectTotal = money(
      direct * (budget.indirect_pct / 100) + budget.indirect_fixed,
    );
    const total = money(direct + indirectTotal);

    await this.repository.updateCalculations(
      companyId,
      budgetId,
      [...byId.values()].map((item) => ({ id: item.id, partial: item.partial_amount })),
      { subtotal: direct, indirectTotal, total },
    );
  }

  private async getBudget(companyId: string, id: string): Promise<BudgetDetail> {
    const budget = await this.repository.getDetail(companyId, id);
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');
    return budget;
  }

  private assertEditable(budget: BudgetRow): void {
    if (budget.status === 'approved' || budget.status === 'superseded') {
      throw new BadRequestException('El presupuesto está bloqueado');
    }
  }

  private nextCode(
    items: BudgetItemRow[],
    parentId: string | null,
    itemType: 'chapter' | 'activity',
  ): string {
    if (itemType === 'chapter') {
      let number = items.filter((item) => item.parent_id === null && item.item_type === 'chapter').length + 1;
      let code = String(number).padStart(2, '0');
      while (items.some((item) => item.code === code)) {
        number++;
        code = String(number).padStart(2, '0');
      }
      return code;
    }
    if (!parentId) {
      let number = items.filter((item) => item.parent_id === null && item.item_type === 'activity').length + 1;
      let code = `A-${String(number).padStart(2, '0')}`;
      while (items.some((item) => item.code === code)) {
        number++;
        code = `A-${String(number).padStart(2, '0')}`;
      }
      return code;
    }
    const parent = items.find((item) => item.id === parentId)!;
    let number = items.filter((item) => item.parent_id === parentId).length + 1;
    let code = `${parent.code}.${String(number).padStart(2, '0')}`;
    while (items.some((item) => item.code === code)) {
      number++;
      code = `${parent.code}.${String(number).padStart(2, '0')}`;
    }
    return code;
  }

  private assertWritable(companyId: string): Promise<void> {
    return this.entitlements.assertWritableModule(companyId, PROJECTS_MODULE_CODE);
  }
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
