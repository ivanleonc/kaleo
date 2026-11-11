import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogRepository } from './catalog.repository.js';
import { EntitlementService } from '../kernel/billing/entitlement.service.js';
import {
  UNIT_KINDS,
  type CurrencyRow,
  type TaxRateFilters,
  type TaxRateRow,
  type UnitConversionRow,
  type UnitFilters,
  type UnitKind,
  type UnitRow,
} from './catalog.types.js';

export const CATALOG_MODULE_CODE = 'shared.catalog';

@Injectable()
export class CatalogService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly entitlements: EntitlementService,
  ) {}

  listCurrencies(): Promise<CurrencyRow[]> {
    return this.repository.listCurrencies();
  }

  listUnits(companyId: string, filters: UnitFilters): Promise<UnitRow[]> {
    return this.repository.listUnits(companyId, filters);
  }

  async createUnit(
    companyId: string,
    input: { code: string; name: string; kind: UnitKind; precision: number; isActive?: boolean },
  ): Promise<UnitRow> {
    await this.entitlements.assertWritableModule(companyId, CATALOG_MODULE_CODE);
    const code = requiredText(input.code, 'El código es obligatorio').toLowerCase();
    const name = requiredText(input.name, 'El nombre es obligatorio');
    if (!UNIT_KINDS.includes(input.kind)) {
      throw new BadRequestException('Tipo de unidad inválido');
    }
    if (!Number.isInteger(input.precision) || input.precision < 0 || input.precision > 8) {
      throw new BadRequestException('La precisión debe ser un entero entre 0 y 8');
    }
    if (await this.repository.findUnitByCode(companyId, code)) {
      throw new ConflictException('Ya existe una unidad con ese código');
    }
    return this.repository.createUnit(companyId, {
      code,
      name,
      kind: input.kind,
      precision: input.precision,
      isActive: input.isActive,
    });
  }

  async updateUnit(
    companyId: string,
    unitId: string,
    input: {
      code?: string;
      name?: string;
      kind?: UnitKind;
      precision?: number;
      isActive?: boolean;
    },
  ): Promise<UnitRow> {
    await this.entitlements.assertWritableModule(companyId, CATALOG_MODULE_CODE);
    const current = await this.repository.findUnitById(companyId, unitId);
    if (!current) throw new NotFoundException('Unidad no encontrada');
    if (current.is_global) {
      throw new BadRequestException('Las unidades globales no se pueden editar');
    }

    const code = input.code === undefined ? undefined : requiredText(input.code, 'El código es obligatorio').toLowerCase();
    if (code && code !== current.code) {
      const existing = await this.repository.findUnitByCode(companyId, code);
      if (existing && existing.id !== unitId) {
        throw new ConflictException('Ya existe una unidad con ese código');
      }
    }
    if (input.kind && !UNIT_KINDS.includes(input.kind)) {
      throw new BadRequestException('Tipo de unidad inválido');
    }
    if (
      input.precision !== undefined &&
      (!Number.isInteger(input.precision) || input.precision < 0 || input.precision > 8)
    ) {
      throw new BadRequestException('La precisión debe ser un entero entre 0 y 8');
    }

    const updated = await this.repository.updateUnit(companyId, unitId, {
      code,
      name: input.name === undefined ? undefined : requiredText(input.name, 'El nombre es obligatorio'),
      kind: input.kind,
      precision: input.precision,
      isActive: input.isActive,
    });
    if (!updated) throw new NotFoundException('Unidad no encontrada');
    return updated;
  }

  async deleteUnit(companyId: string, unitId: string): Promise<void> {
    await this.entitlements.assertWritableModule(companyId, CATALOG_MODULE_CODE);
    const unit = await this.repository.findUnitById(companyId, unitId);
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    if (unit.is_global) {
      throw new BadRequestException('Las unidades globales no se pueden eliminar');
    }
    const deleted = await this.repository.deleteUnit(companyId, unitId);
    if (!deleted) throw new NotFoundException('Unidad no encontrada');
  }

  async listConversions(companyId: string, unitId: string): Promise<UnitConversionRow[]> {
    const unit = await this.repository.findUnitById(companyId, unitId);
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    return this.repository.listConversions(companyId, unitId);
  }

  async addConversion(
    companyId: string,
    fromUnitId: string,
    input: { toUnitId: string; factor: number },
  ): Promise<UnitConversionRow> {
    await this.entitlements.assertWritableModule(companyId, CATALOG_MODULE_CODE);
    if (fromUnitId === input.toUnitId) {
      throw new BadRequestException('La unidad destino debe ser distinta');
    }
    if (!Number.isFinite(input.factor) || input.factor <= 0) {
      throw new BadRequestException('El factor debe ser mayor a cero');
    }

    const [from, to] = await Promise.all([
      this.repository.findUnitById(companyId, fromUnitId),
      this.repository.findUnitById(companyId, input.toUnitId),
    ]);
    if (!from || !to) throw new NotFoundException('Unidad no encontrada');
    if (from.kind !== to.kind) {
      throw new BadRequestException('Las unidades deben ser del mismo tipo');
    }

    const existing = await this.repository.findConversion(companyId, fromUnitId, input.toUnitId);
    if (existing) {
      throw new ConflictException('Ya existe una conversión entre esas unidades');
    }

    return this.repository.createConversion(companyId, fromUnitId, input.toUnitId, input.factor);
  }

  async deleteConversion(companyId: string, conversionId: string): Promise<void> {
    await this.entitlements.assertWritableModule(companyId, CATALOG_MODULE_CODE);
    const deleted = await this.repository.deleteConversion(companyId, conversionId);
    if (!deleted) {
      throw new NotFoundException('Conversión no encontrada o es global (no editable)');
    }
  }

  listTaxRates(companyId: string, filters: TaxRateFilters): Promise<TaxRateRow[]> {
    return this.repository.listTaxRates(companyId, filters);
  }

  async createTaxRate(
    companyId: string,
    input: {
      code: string;
      name: string;
      rate: number;
      countryCode?: string | null;
      isActive?: boolean;
    },
  ): Promise<TaxRateRow> {
    await this.entitlements.assertWritableModule(companyId, CATALOG_MODULE_CODE);
    const code = requiredText(input.code, 'El código es obligatorio').toLowerCase();
    const name = requiredText(input.name, 'El nombre es obligatorio');
    const rate = validRate(input.rate);
    if (await this.repository.findTaxRateByCode(companyId, code)) {
      throw new ConflictException('Ya existe un impuesto con ese código');
    }
    return this.repository.createTaxRate(companyId, {
      code,
      name,
      rate,
      countryCode: normalizeCountry(input.countryCode),
      isActive: input.isActive ?? true,
    });
  }

  async updateTaxRate(
    companyId: string,
    id: string,
    input: {
      code?: string;
      name?: string;
      rate?: number;
      countryCode?: string | null;
      isActive?: boolean;
    },
  ): Promise<TaxRateRow> {
    await this.entitlements.assertWritableModule(companyId, CATALOG_MODULE_CODE);
    const current = await this.repository.findTaxRateById(companyId, id);
    if (!current) throw new NotFoundException('Impuesto no encontrado');

    const code = input.code === undefined ? undefined : requiredText(input.code, 'El código es obligatorio').toLowerCase();
    if (code && code !== current.code) {
      const existing = await this.repository.findTaxRateByCode(companyId, code);
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe un impuesto con ese código');
      }
    }
    const updated = await this.repository.updateTaxRate(companyId, id, {
      code,
      name: input.name === undefined ? undefined : requiredText(input.name, 'El nombre es obligatorio'),
      rate: input.rate === undefined ? undefined : validRate(input.rate),
      countryCode: input.countryCode === undefined ? undefined : normalizeCountry(input.countryCode),
      isActive: input.isActive,
    });
    if (!updated) throw new NotFoundException('Impuesto no encontrado');
    return updated;
  }

  async deleteTaxRate(companyId: string, id: string): Promise<void> {
    await this.entitlements.assertWritableModule(companyId, CATALOG_MODULE_CODE);
    const deleted = await this.repository.deleteTaxRate(companyId, id);
    if (!deleted) throw new NotFoundException('Impuesto no encontrado');
  }
}

function requiredText(value: string | null | undefined, message: string): string {
  const text = value?.trim();
  if (!text) throw new BadRequestException(message);
  return text;
}

function validRate(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException('La tasa debe ser un número mayor o igual a cero');
  }
  return value;
}

function normalizeCountry(value: string | null | undefined): string | null {
  const text = value?.trim().toUpperCase();
  if (!text) return null;
  if (!/^[A-Z]{2}$/.test(text)) {
    throw new BadRequestException('El país debe ser ISO 3166-1 alpha-2');
  }
  return text;
}
