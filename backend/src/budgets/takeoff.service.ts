import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TakeoffRepository } from './takeoff.repository.js';
import { BudgetsRepository } from './budgets.repository.js';
import { BudgetsService } from './budgets.service.js';
import { EntitlementService } from '../kernel/billing/entitlement.service.js';
import type {
  CreateTakeoffLineInput,
  CreateTakeoffSheetInput,
  TakeoffSheetDetail,
  TakeoffSheetRow,
} from './budgets.types.js';

const PROJECTS_MODULE_CODE = 'construction.projects';

@Injectable()
export class TakeoffService {
  constructor(
    private readonly repository: TakeoffRepository,
    private readonly budgetsRepository: BudgetsRepository,
    private readonly budgets: BudgetsService,
    private readonly entitlements: EntitlementService,
  ) {}

  listSheets(companyId: string, projectId: string): Promise<TakeoffSheetRow[]> {
    return this.repository.listSheets(companyId, projectId);
  }

  async getSheet(companyId: string, id: string): Promise<TakeoffSheetDetail> {
    const sheet = await this.repository.getDetail(companyId, id);
    if (!sheet) throw new NotFoundException('Hoja de takeoff no encontrada');
    return sheet;
  }

  async createSheet(
    companyId: string,
    userId: string,
    projectId: string,
    input: CreateTakeoffSheetInput,
  ): Promise<TakeoffSheetDetail> {
    await this.assertWritable(companyId);
    const name = requiredText(input.name, 'El nombre es obligatorio');
    if (input.budgetItemId) {
      await this.assertBudgetItem(companyId, input.budgetItemId);
    }
    const created = await this.repository.createSheet(companyId, userId, projectId, {
      ...input,
      name,
    });
    return created!;
  }

  async updateSheet(
    companyId: string,
    id: string,
    input: {
      name?: string;
      description?: string | null;
      budgetItemId?: string | null;
      status?: string;
    },
  ): Promise<TakeoffSheetDetail> {
    await this.assertWritable(companyId);
    if (input.budgetItemId) {
      await this.assertBudgetItem(companyId, input.budgetItemId);
    }
    const updated = await this.repository.updateSheet(companyId, id, input);
    if (!updated) throw new NotFoundException('Hoja de takeoff no encontrada');
    return this.getSheet(companyId, id);
  }

  async deleteSheet(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deleteSheet(companyId, id);
    if (!deleted) throw new NotFoundException('Hoja de takeoff no encontrada');
  }

  async addLine(
    companyId: string,
    sheetId: string,
    input: CreateTakeoffLineInput,
  ): Promise<TakeoffSheetDetail> {
    await this.assertWritable(companyId);
    await this.getSheet(companyId, sheetId);
    if (!input.description?.trim()) {
      throw new BadRequestException('La descripción es obligatoria');
    }
    if (!(await this.budgetsRepository.unitExists(companyId, input.unitId))) {
      throw new BadRequestException('La unidad no existe');
    }
    validateDimensions(input);
    const quantity = computeQuantity(input);
    const line = await this.repository.createLine(
      companyId,
      sheetId,
      { ...input, description: input.description.trim() },
      quantity,
    );
    if (!line) throw new BadRequestException('No pudimos crear la línea');
    return this.getSheet(companyId, sheetId);
  }

  async updateLine(
    companyId: string,
    lineId: string,
    input: Partial<CreateTakeoffLineInput>,
  ): Promise<TakeoffSheetDetail> {
    await this.assertWritable(companyId);
    const current = await this.repository.findLineById(companyId, lineId);
    if (!current) throw new NotFoundException('Línea de takeoff no encontrada');
    if (input.unitId && !(await this.budgetsRepository.unitExists(companyId, input.unitId))) {
      throw new BadRequestException('La unidad no existe');
    }
    const merged: CreateTakeoffLineInput = {
      description: input.description ?? current.description,
      unitId: input.unitId ?? current.unit_id,
      parts: input.parts ?? current.parts,
      length: input.length ?? current.length,
      width: input.width ?? current.width,
      height: input.height ?? current.height,
      quantity: input.quantity,
      notes: input.notes === undefined ? current.notes : input.notes,
    };
    validateDimensions(merged);
    const quantity =
      input.quantity !== undefined && input.quantity > 0
        ? input.quantity
        : computeQuantity(merged);
    const updated = await this.repository.updateLine(
      companyId,
      current.sheet_id,
      lineId,
      merged,
      quantity,
    );
    if (!updated) throw new NotFoundException('Línea de takeoff no encontrada');
    return this.getSheet(companyId, current.sheet_id);
  }

  async deleteLine(companyId: string, lineId: string): Promise<TakeoffSheetDetail> {
    await this.assertWritable(companyId);
    const current = await this.repository.findLineById(companyId, lineId);
    if (!current) throw new NotFoundException('Línea de takeoff no encontrada');
    const deleted = await this.repository.deleteLine(companyId, current.sheet_id, lineId);
    if (!deleted) throw new NotFoundException('Línea de takeoff no encontrada');
    return this.getSheet(companyId, current.sheet_id);
  }

  /**
   * Aplica la cantidad total de la hoja a la actividad de presupuesto asociada
   * (solo líneas con la misma unidad de la actividad). Recalcula el presupuesto.
   */
  async applyToBudgetItem(companyId: string, sheetId: string): Promise<TakeoffSheetDetail> {
    await this.assertWritable(companyId);
    const sheet = await this.getSheet(companyId, sheetId);
    if (!sheet.budget_item_id) {
      throw new BadRequestException('La hoja no tiene actividad de presupuesto asociada');
    }
    if (sheet.lines.length === 0) {
      throw new BadRequestException('La hoja no tiene líneas para aplicar');
    }
    const item = await this.budgetsRepository.findItemById(companyId, sheet.budget_item_id);
    if (!item) throw new NotFoundException('La actividad de presupuesto no existe');
    if (item.item_type !== 'activity') {
      throw new BadRequestException('El takeoff solo se aplica a actividades');
    }
    const matching = sheet.lines.filter((line) => line.unit_id === item.unit_id);
    if (matching.length === 0) {
      throw new BadRequestException(
        'Ninguna línea coincide con la unidad de la actividad; revisa las unidades del takeoff',
      );
    }
    const total = round6(matching.reduce((sum, line) => sum + line.quantity, 0));
    await this.budgets.updateItem(companyId, item.budget_id, item.id, { quantity: total });
    await this.repository.updateSheet(companyId, sheetId, { status: 'confirmed' });
    return this.getSheet(companyId, sheetId);
  }

  private async assertBudgetItem(companyId: string, budgetItemId: string): Promise<void> {
    const item = await this.budgetsRepository.findItemById(companyId, budgetItemId);
    if (!item) throw new BadRequestException('La actividad de presupuesto no existe');
  }

  private assertWritable(companyId: string): Promise<void> {
    return this.entitlements.assertWritableModule(companyId, PROJECTS_MODULE_CODE);
  }
}

export function computeQuantity(input: {
  parts?: number;
  length?: number;
  width?: number;
  height?: number;
  quantity?: number;
}): number {
  if (input.quantity !== undefined && input.quantity > 0) return round6(input.quantity);
  const parts = input.parts && input.parts > 0 ? input.parts : 1;
  let quantity = parts;
  if (input.length && input.length > 0) quantity *= input.length;
  if (input.width && input.width > 0) quantity *= input.width;
  if (input.height && input.height > 0) quantity *= input.height;
  return round6(quantity);
}

function validateDimensions(input: CreateTakeoffLineInput): void {
  for (const value of [input.parts, input.length, input.width, input.height, input.quantity]) {
    if (value !== undefined && (Number.isNaN(value) || value < 0)) {
      throw new BadRequestException('Las dimensiones no pueden ser negativas');
    }
  }
  if (input.parts !== undefined && input.parts <= 0) {
    throw new BadRequestException('Las piezas deben ser mayores a cero');
  }
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function requiredText(value: string | null | undefined, message: string): string {
  const text = value?.trim();
  if (!text) throw new BadRequestException(message);
  return text;
}
