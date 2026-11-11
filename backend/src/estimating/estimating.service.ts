import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstimatingRepository } from './estimating.repository.js';
import { EntitlementService } from '../kernel/billing/entitlement.service.js';
import { parseNumeric } from '../common/import/tabular-import.js';
import {
  RESOURCE_TYPES,
  type ApuBaseRow,
  type ApuDetail,
  type ApuLineRow,
  type ApuRow,
  type CreateApuBaseInput,
  type CreateApuInput,
  type CreateApuLineInput,
  type CreateResourceInput,
  type ResourcePriceRow,
  type ResourceRow,
  type ResourceType,
  type UpdateApuInput,
  type UpdateResourceInput,
} from './estimating.types.js';

export const ESTIMATING_MODULE_CODE = 'construction.estimating';

export interface ImportApusResult {
  apusCreated: number;
  apusUpdated: number;
  linesCreated: number;
  resourcesCreated: number;
  errors: string[];
}

const IMPORT_TYPE_ALIASES: Record<string, ResourceType> = {
  material: 'material',
  materiales: 'material',
  labor: 'labor',
  mano_de_obra: 'labor',
  mano_obra: 'labor',
  equipment: 'equipment',
  equipo: 'equipment',
  equipos: 'equipment',
  transport: 'transport',
  transporte: 'transport',
  transportes: 'transport',
  subcontract: 'subcontract',
  subcontrato: 'subcontract',
  subcontratos: 'subcontract',
};

@Injectable()
export class EstimatingService {
  constructor(
    private readonly repository: EstimatingRepository,
    private readonly entitlements: EntitlementService,
  ) {}

  listResources(
    companyId: string,
    filters: { search?: string; resourceType?: ResourceType },
  ): Promise<ResourceRow[]> {
    return this.repository.listResources(companyId, filters);
  }

  async createResource(
    companyId: string,
    userId: string,
    input: CreateResourceInput,
  ): Promise<ResourceRow> {
    await this.assertWritable(companyId);
    const normalized = await this.validateResource(companyId, input);
    if (await this.repository.findResourceByCode(companyId, normalized.code)) {
      throw new ConflictException('Ya existe un recurso con ese código');
    }
    try {
      return await this.repository.createResource(companyId, userId, normalized);
    } catch (error) {
      throw mapUniqueViolation(error, 'Ya existe un recurso con ese código');
    }
  }

  async updateResource(
    companyId: string,
    userId: string,
    id: string,
    input: UpdateResourceInput,
  ): Promise<ResourceRow> {
    await this.assertWritable(companyId);
    const current = await this.repository.findResourceById(companyId, id);
    if (!current) throw new NotFoundException('Recurso no encontrado');
    if (input.code && input.code.toLowerCase() !== current.code.toLowerCase()) {
      const existing = await this.repository.findResourceByCode(companyId, input.code);
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe un recurso con ese código');
      }
    }
    const normalized = await this.validateResource(companyId, {
      resourceType: input.resourceType ?? current.resource_type,
      code: input.code ?? current.code,
      name: input.name ?? current.name,
      description: input.description === undefined ? current.description : input.description,
      unitId: input.unitId ?? current.unit_id,
      baseCost: input.baseCost ?? current.base_cost,
      currencyCode: input.currencyCode ?? current.currency_code,
      catalogItemId:
        input.catalogItemId === undefined ? current.catalog_item_id : input.catalogItemId,
      isActive: input.isActive ?? current.is_active,
    });
    const updated = await this.repository.updateResource(companyId, userId, id, {
      ...input,
      code: input.code === undefined ? undefined : normalized.code,
    });
    if (!updated) throw new NotFoundException('Recurso no encontrado');
    return updated;
  }

  async deleteResource(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deleteResource(companyId, id);
    if (!deleted) throw new NotFoundException('Recurso no encontrado');
  }

  async listResourcePrices(companyId: string, resourceId: string): Promise<ResourcePriceRow[]> {
    const resource = await this.repository.findResourceById(companyId, resourceId);
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    return this.repository.listResourcePrices(companyId, resourceId);
  }

  async addResourcePrice(
    companyId: string,
    resourceId: string,
    input: {
      supplierPartyId?: string | null;
      price: number;
      currencyCode: string;
      validFrom?: string | null;
      validTo?: string | null;
      source?: string | null;
    },
  ): Promise<ResourcePriceRow> {
    await this.assertWritable(companyId);
    const resource = await this.repository.findResourceById(companyId, resourceId);
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    if (!(await this.repository.currencyExists(input.currencyCode))) {
      throw new BadRequestException('La moneda no existe');
    }
    if (input.supplierPartyId && !(await this.repository.partyExists(companyId, input.supplierPartyId))) {
      throw new BadRequestException('El proveedor no existe');
    }
    if (input.price < 0) throw new BadRequestException('El precio debe ser mayor o igual a cero');
    if (input.validFrom && input.validTo && input.validTo < input.validFrom) {
      throw new BadRequestException('La vigencia final no puede ser anterior a la inicial');
    }
    return this.repository.addResourcePrice(companyId, resourceId, input);
  }

  async deleteResourcePrice(
    companyId: string,
    resourceId: string,
    priceId: string,
  ): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deleteResourcePrice(companyId, resourceId, priceId);
    if (!deleted) throw new NotFoundException('Precio no encontrado');
  }

  listApuBases(companyId: string): Promise<ApuBaseRow[]> {
    return this.repository.listApuBases(companyId);
  }

  async createApuBase(
    companyId: string,
    input: CreateApuBaseInput,
  ): Promise<ApuBaseRow> {
    await this.assertWritable(companyId);
    const code = requiredText(input.code, 'El código es obligatorio').toLowerCase();
    const name = requiredText(input.name, 'El nombre es obligatorio');
    if (await this.repository.findApuBaseByCode(companyId, code)) {
      throw new ConflictException('Ya existe una base de APUs con ese código');
    }
    try {
      return await this.repository.createApuBase(companyId, { ...input, code, name });
    } catch (error) {
      throw mapUniqueViolation(error, 'Ya existe una base de APUs con ese código');
    }
  }

  async updateApuBase(
    companyId: string,
    id: string,
    input: Partial<CreateApuBaseInput>,
  ): Promise<ApuBaseRow> {
    await this.assertWritable(companyId);
    const current = await this.repository.findApuBaseById(companyId, id);
    if (!current) throw new NotFoundException('Base de APUs no encontrada');
    if (input.code && input.code.toLowerCase() !== current.code.toLowerCase()) {
      const existing = await this.repository.findApuBaseByCode(companyId, input.code);
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe una base de APUs con ese código');
      }
    }
    const updated = await this.repository.updateApuBase(companyId, id, {
      ...input,
      code: input.code?.trim().toLowerCase(),
      name: input.name === undefined ? undefined : requiredText(input.name, 'El nombre es obligatorio'),
    });
    if (!updated) throw new NotFoundException('Base de APUs no encontrada');
    return updated;
  }

  async deleteApuBase(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deleteApuBase(companyId, id);
    if (!deleted) throw new NotFoundException('Base de APUs no encontrada');
  }

  listApus(
    companyId: string,
    filters: { search?: string; baseId?: string },
  ): Promise<ApuRow[]> {
    return this.repository.listApus(companyId, filters);
  }

  async getApu(companyId: string, id: string): Promise<ApuDetail> {
    const apu = await this.repository.getApuDetail(companyId, id);
    if (!apu) throw new NotFoundException('APU no encontrado');
    return apu;
  }

  async createApu(
    companyId: string,
    userId: string,
    input: CreateApuInput,
  ): Promise<ApuDetail> {
    await this.assertWritable(companyId);
    const normalized = await this.validateApu(companyId, input);
    if (await this.repository.findApuByCode(companyId, normalized.baseId, normalized.code)) {
      throw new ConflictException('Ya existe un APU con ese código en la base');
    }
    try {
      return await this.repository.createApu(companyId, userId, normalized);
    } catch (error) {
      throw mapUniqueViolation(error, 'Ya existe un APU con ese código en la base');
    }
  }

  async updateApu(
    companyId: string,
    userId: string,
    id: string,
    input: UpdateApuInput,
  ): Promise<ApuDetail> {
    await this.assertWritable(companyId);
    const current = await this.getApu(companyId, id);
    if (input.code && input.code.toLowerCase() !== current.code.toLowerCase()) {
      const existing = await this.repository.findApuByCode(
        companyId,
        input.baseId ?? current.base_id,
        input.code,
      );
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe un APU con ese código en la base');
      }
    }
    const normalized = await this.validateApu(companyId, {
      baseId: input.baseId ?? current.base_id,
      code: input.code ?? current.code,
      name: input.name ?? current.name,
      description: input.description === undefined ? current.description : input.description,
      unitId: input.unitId ?? current.unit_id,
      status: input.status ?? current.status,
    });
    const updated = await this.repository.updateApu(companyId, userId, id, {
      code: normalized.code,
      name: normalized.name,
      description: normalized.description,
      unitId: normalized.unitId,
      status: normalized.status,
    });
    if (!updated) throw new NotFoundException('APU no encontrado');
    return updated;
  }

  async deleteApu(companyId: string, id: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deleteApu(companyId, id);
    if (!deleted) throw new NotFoundException('APU no encontrado');
  }

  async createApuVersion(companyId: string, userId: string, id: string): Promise<ApuDetail> {
    await this.assertWritable(companyId);
    const detail = await this.repository.createApuVersion(companyId, userId, id);
    if (!detail) throw new NotFoundException('APU no encontrado');
    return detail;
  }

  async addApuLine(
    companyId: string,
    apuId: string,
    input: CreateApuLineInput,
  ): Promise<ApuLineRow> {
    await this.assertWritable(companyId);
    const apu = await this.getApu(companyId, apuId);
    if (!apu.current_version_id) throw new BadRequestException('El APU no tiene versión actual');
    const current = apu.versions.find((version) => version.id === apu.current_version_id);
    if (!current || current.status !== 'draft') {
      throw new BadRequestException('La versión actual del APU está bloqueada; crea una nueva versión');
    }
    const resource = await this.repository.findResourceById(companyId, input.resourceId);
    if (!resource) throw new BadRequestException('El recurso no existe');
    if (input.quantity < 0) throw new BadRequestException('La cantidad debe ser mayor o igual a cero');
    if ((input.wastePct ?? 0) < 0) throw new BadRequestException('El desperdicio no puede ser negativo');
    if ((input.performance ?? 1) <= 0) throw new BadRequestException('El rendimiento debe ser mayor a cero');
    return this.repository.addLine(companyId, apu.current_version_id, input);
  }

  async updateApuLine(
    companyId: string,
    lineId: string,
    input: { quantity?: number; wastePct?: number; performance?: number; notes?: string | null },
  ): Promise<ApuLineRow> {
    await this.assertWritable(companyId);
    if (input.quantity !== undefined && input.quantity < 0) {
      throw new BadRequestException('La cantidad debe ser mayor o igual a cero');
    }
    if (input.wastePct !== undefined && input.wastePct < 0) {
      throw new BadRequestException('El desperdicio no puede ser negativo');
    }
    if (input.performance !== undefined && input.performance <= 0) {
      throw new BadRequestException('El rendimiento debe ser mayor a cero');
    }
    const updated = await this.repository.updateLine(companyId, lineId, input);
    if (!updated) throw new NotFoundException('Insumo no encontrado o versión bloqueada');
    return updated;
  }

  async deleteApuLine(companyId: string, lineId: string): Promise<void> {
    await this.assertWritable(companyId);
    const deleted = await this.repository.deleteLine(companyId, lineId);
    if (!deleted) throw new NotFoundException('Insumo no encontrado o versión bloqueada');
  }

  async approveApu(companyId: string, userId: string, apuId: string): Promise<ApuDetail> {
    await this.assertWritable(companyId);
    const apu = await this.getApu(companyId, apuId);
    if (!apu.current_version_id) throw new NotFoundException('APU sin versión actual');
    const approved = await this.repository.approveVersion(
      companyId,
      userId,
      apu.current_version_id,
    );
    if (!approved) throw new NotFoundException('Versión de APU no encontrada');
    return this.getApu(companyId, apuId);
  }

  /**
   * Importa APUs desde filas parseadas de CSV/XLSX. Cada fila es un insumo;
   * las filas con el mismo `apu_code` componen el mismo APU. Los recursos se
   * buscan por código y se crean si no existen. Si el APU ya existe y su
   * versión está aprobada, se crea una nueva versión en borrador.
   */
  async importApus(
    companyId: string,
    userId: string,
    baseId: string,
    records: Record<string, string>[],
  ): Promise<ImportApusResult> {
    await this.assertWritable(companyId);
    const base = await this.repository.findApuBaseById(companyId, baseId);
    if (!base) throw new NotFoundException('Base de APUs no encontrada');
    if (records.length === 0) {
      throw new BadRequestException('El archivo no contiene filas válidas');
    }

    const result: ImportApusResult = {
      apusCreated: 0,
      apusUpdated: 0,
      linesCreated: 0,
      resourcesCreated: 0,
      errors: [],
    };

    const groups = new Map<string, Array<{ row: number; data: Record<string, string> }>>();
    records.forEach((record, index) => {
      const code = record.apu_code?.trim().toLowerCase();
      if (!code) {
        result.errors.push(`Fila ${index + 2}: falta apu_codigo`);
        return;
      }
      groups.set(code, [...(groups.get(code) ?? []), { row: index + 2, data: record }]);
    });

    for (const [code, entries] of groups) {
      try {
        const first = entries[0]!.data;
        const name = first.apu_name?.trim() || code;
        let apu = await this.repository.findApuByCode(companyId, baseId, code);
        if (!apu) {
          const unitId = first.apu_unit
            ? await this.repository.findUnitIdByCode(companyId, first.apu_unit.trim())
            : null;
          if (!unitId) {
            throw new Error(`unidad de salida "${first.apu_unit ?? ''}" no encontrada`);
          }
          const created = await this.repository.createApu(companyId, userId, {
            baseId,
            code,
            name,
            unitId,
          });
          result.apusCreated++;
          apu = created;
        } else {
          result.apusUpdated++;
        }

        let detail = await this.repository.getApuDetail(companyId, apu.id);
        if (!detail) throw new Error('APU no encontrado tras la creación');
        if (detail.current_version_status === 'approved') {
          detail = await this.repository.createApuVersion(companyId, userId, apu.id);
          if (!detail) throw new Error('no se pudo crear la nueva versión');
        }
        if (!detail.current_version_id) throw new Error('el APU no tiene versión actual');

        for (const entry of entries) {
          const { row, data } = entry;
          if (!data.resource_code && !data.resource_name) continue;
          const resource = await this.resolveImportResource(companyId, userId, data, result);
          if (!resource) {
            result.errors.push(`Fila ${row}: insumo omitido`);
            continue;
          }
          await this.repository.addLine(companyId, detail.current_version_id, {
            resourceId: resource.id,
            quantity: parseNumeric(data.quantity) ?? 0,
            wastePct: parseNumeric(data.waste_pct) ?? 0,
            performance: parseNumeric(data.performance) ?? 1,
            notes: data.notes ?? null,
          });
          result.linesCreated++;
        }
      } catch (error) {
        result.errors.push(`APU ${code}: ${(error as Error).message}`);
      }
    }

    return result;
  }

  private async resolveImportResource(
    companyId: string,
    userId: string,
    row: Record<string, string>,
    result: ImportApusResult,
  ): Promise<ResourceRow | null> {
    const rawCode = row.resource_code?.trim().toLowerCase();
    const name = row.resource_name?.trim();
    const code =
      rawCode ||
      (name
        ? name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40)
        : '');
    if (!code) return null;

    const existing = await this.repository.findResourceByCode(companyId, code);
    if (existing) return existing;
    if (!name) {
      result.errors.push(`Recurso ${code}: falta el nombre`);
      return null;
    }
    const unitId = row.resource_unit
      ? await this.repository.findUnitIdByCode(companyId, row.resource_unit.trim())
      : null;
    if (!unitId) {
      result.errors.push(`Recurso ${code}: unidad "${row.resource_unit ?? ''}" no encontrada`);
      return null;
    }
    const type =
      IMPORT_TYPE_ALIASES[
        (row.resource_type?.trim().toLowerCase() ?? '').replace(/\s+/g, '_')
      ] ?? 'material';
    const created = await this.repository.createResource(companyId, userId, {
      resourceType: type,
      code,
      name,
      unitId,
      baseCost: parseNumeric(row.cost) ?? 0,
      currencyCode: (row.currency ?? 'COP').toUpperCase(),
    });
    result.resourcesCreated++;
    return created;
  }

  private async validateResource(
    companyId: string,
    input: CreateResourceInput,
  ): Promise<CreateResourceInput> {
    if (!RESOURCE_TYPES.includes(input.resourceType)) {
      throw new BadRequestException('Tipo de recurso inválido');
    }
    const code = requiredText(input.code, 'El código es obligatorio').toLowerCase();
    const name = requiredText(input.name, 'El nombre es obligatorio');
    if (!(await this.repository.unitExists(companyId, input.unitId))) {
      throw new BadRequestException('La unidad no existe');
    }
    if (!(await this.repository.currencyExists(input.currencyCode.toUpperCase()))) {
      throw new BadRequestException('La moneda no existe');
    }
    if (input.catalogItemId && !(await this.repository.catalogItemExists(companyId, input.catalogItemId))) {
      throw new BadRequestException('El ítem de catálogo no existe');
    }
    if (input.baseCost < 0) throw new BadRequestException('El costo base no puede ser negativo');
    return {
      ...input,
      code,
      name,
      currencyCode: input.currencyCode.toUpperCase(),
      description: optionalText(input.description),
      catalogItemId: input.catalogItemId ?? null,
    };
  }

  private async validateApu(
    companyId: string,
    input: CreateApuInput,
  ): Promise<CreateApuInput> {
    const base = await this.repository.findApuBaseById(companyId, input.baseId);
    if (!base) throw new BadRequestException('La base de APUs no existe');
    if (!(await this.repository.unitExists(companyId, input.unitId))) {
      throw new BadRequestException('La unidad no existe');
    }
    return {
      ...input,
      code: requiredText(input.code, 'El código es obligatorio').toLowerCase(),
      name: requiredText(input.name, 'El nombre es obligatorio'),
      description: optionalText(input.description),
      status: input.status ?? 'active',
    };
  }

  private assertWritable(companyId: string): Promise<void> {
    return this.entitlements.assertWritableModule(companyId, ESTIMATING_MODULE_CODE);
  }
}

function requiredText(value: string | null | undefined, message: string): string {
  const text = value?.trim();
  if (!text) throw new BadRequestException(message);
  return text;
}

function optionalText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function mapUniqueViolation(error: unknown, message: string): Error {
  if ((error as { code?: string })?.code === '23505') return new ConflictException(message);
  return error as Error;
}
