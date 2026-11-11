import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BudgetsService } from './budgets.service.js';
import {
  AddApusToBudgetDto,
  CreateBudgetDto,
  CreateBudgetItemDto,
  CreateBudgetVersionDto,
  UpdateBudgetDto,
  UpdateBudgetItemDto,
} from './dto/budget.dto.js';
import { ExportQueryDto } from '../common/export/export-query.dto.js';
import { TabularExportService } from '../common/export/tabular-export.service.js';
import type { ExportColumn } from '../common/export/export.types.js';
import {
  mapRecords,
  parseNumeric,
  parseTabularMatrix,
} from '../common/import/tabular-import.js';
import type { BudgetImportRow } from './budgets.service.js';
import type { BudgetItemRow, MaterialRow } from './budgets.types.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { Permissions } from '../common/constants/permissions.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

const BUDGET_IMPORT_ALIASES: Record<string, string> = {
  capitulo_codigo: 'chapter_code',
  codigo_capitulo: 'chapter_code',
  chapter_code: 'chapter_code',
  capitulo: 'chapter_name',
  capitulo_nombre: 'chapter_name',
  nombre_capitulo: 'chapter_name',
  chapter_name: 'chapter_name',
  codigo: 'code',
  code: 'code',
  actividad: 'name',
  nombre: 'name',
  descripcion: 'name',
  name: 'name',
  unidad: 'unit',
  und: 'unit',
  unit: 'unit',
  cantidad: 'quantity',
  qty: 'quantity',
  quantity: 'quantity',
  valor_unitario: 'unit_price',
  precio_unitario: 'unit_price',
  precio: 'unit_price',
  unit_price: 'unit_price',
};

const MATERIAL_COLUMNS: ExportColumn<MaterialRow>[] = [
  { id: 'resource_code', header: 'Código', value: (row) => row.resource_code },
  { id: 'resource_name', header: 'Insumo', width: 36, value: (row) => row.resource_name },
  { id: 'component_type', header: 'Tipo', value: (row) => row.component_type },
  { id: 'unit_code', header: 'Unidad', width: 10, value: (row) => row.unit_code },
  {
    id: 'quantity',
    header: 'Cantidad total',
    numFmt: '#,##0.0000',
    value: (row) => row.quantity,
  },
  {
    id: 'unit_cost',
    header: 'Costo unitario',
    numFmt: '#,##0.00',
    value: (row) => Math.round(row.unit_cost * 100) / 100,
  },
  {
    id: 'total_cost',
    header: 'Costo total',
    numFmt: '#,##0.00',
    value: (row) => row.total_cost,
  },
  { id: 'currency_code', header: 'Moneda', width: 8, value: (row) => row.currency_code },
  { id: 'apu_count', header: 'APUs', width: 8, value: (row) => row.apu_count },
];

@ApiTags('Budgets - Presupuestos')
@ApiBearerAuth()
@Controller('api')
@UseGuards(PermissionsGuard)
@ApiHeader({ name: 'x-company-id', required: true })
export class BudgetsController {
  constructor(
    private readonly budgets: BudgetsService,
    private readonly exporter: TabularExportService,
  ) {}

  @Get('projects/:projectId/budget')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_READ)
  @ApiOperation({ summary: 'Última versión del presupuesto del proyecto' })
  async getByProject(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return Ok(await this.budgets.getByProject(requireCompany(companyId), projectId));
  }

  @Get('projects/:projectId/budgets')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_READ)
  @ApiOperation({ summary: 'Versiones del presupuesto del proyecto' })
  async listVersions(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return Ok(await this.budgets.listVersions(requireCompany(companyId), projectId));
  }

  @Get('budgets/:id')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_READ)
  @ApiOperation({ summary: 'Detalle de una versión del presupuesto' })
  async getById(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(await this.budgets.getBudgetById(requireCompany(companyId), id));
  }

  @Post('projects/:projectId/budget')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', resolveCreatedId: (response: any) => response?.data?.id })
  @ApiOperation({ summary: 'Crear presupuesto del proyecto' })
  async create(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateBudgetDto,
  ) {
    return Ok(
      await this.budgets.createBudget(
        requireCompany(companyId),
        userId,
        projectId,
        dto.apuBaseId,
      ),
      'Presupuesto creado',
    );
  }

  @Post('projects/:projectId/budget/import')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @Audit({ entityType: 'Budget' })
  @ApiOperation({ summary: 'Importar presupuesto desde CSV/XLSX' })
  async importBudget(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
  ) {
    if (!file?.buffer) throw new BadRequestException('Adjunta un archivo .csv o .xlsx');
    const matrix = await parseTabularMatrix(file);
    const records = mapRecords(matrix, BUDGET_IMPORT_ALIASES, ['name']);
    const rows: BudgetImportRow[] = records.map((record) => ({
      chapterCode: record.chapter_code,
      chapterName: record.chapter_name,
      code: record.code,
      name: record.name!,
      unitCode: record.unit,
      quantity: parseNumeric(record.quantity),
      unitPrice: parseNumeric(record.unit_price),
    }));
    return Ok(
      await this.budgets.importBudget(requireCompany(companyId), userId, projectId, rows),
      'Importación procesada',
    );
  }

  @Patch('budgets/:id')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar indirectos, nombre o etiqueta del presupuesto' })
  async update(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return Ok(
      await this.budgets.updateBudget(requireCompany(companyId), id, dto),
      'Presupuesto actualizado',
    );
  }

  @Post('budgets/:id/versions')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Crear nueva versión desde un presupuesto bloqueado' })
  async createVersion(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBudgetVersionDto,
  ) {
    return Ok(
      await this.budgets.createVersion(requireCompany(companyId), userId, id, dto.label),
      'Versión creada',
    );
  }

  @Get('budgets/:id/compare/:otherId')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_READ)
  @ApiOperation({ summary: 'Comparar dos versiones del presupuesto' })
  async compare(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('otherId', ParseUUIDPipe) otherId: string,
  ) {
    return Ok(await this.budgets.compare(requireCompany(companyId), id, otherId));
  }

  @Get('budgets/:id/materials')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_READ)
  @ApiOperation({ summary: 'Listado total de insumos del presupuesto' })
  async materials(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(await this.budgets.getMaterials(requireCompany(companyId), id));
  }

  @Get('budgets/:id/materials/export')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_READ)
  @ApiOperation({ summary: 'Exportar listado de insumos (CSV/XLSX)' })
  async exportMaterials(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ExportQueryDto,
  ): Promise<StreamableFile> {
    const company = requireCompany(companyId);
    const rows = await this.budgets.getMaterials(company, id);
    const columns = this.exporter.resolveColumns(MATERIAL_COLUMNS, query.columns);
    const file = await this.exporter.generate(query.format ?? 'csv', columns, rows, {
      filename: `insumos-presupuesto-${id}`,
      sheetName: 'Insumos',
    });
    return this.exporter.toStreamableFile(file);
  }

  @Get('budgets/:id/export')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_READ)
  @ApiOperation({ summary: 'Exportar presupuesto (CSV/XLSX)' })
  async exportBudget(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ExportQueryDto,
  ): Promise<StreamableFile> {
    const company = requireCompany(companyId);
    const budget = await this.budgets.getBudgetById(company, id);
    const columns = this.exporter.resolveColumns(BUDGET_COLUMNS, query.columns);
    const file = await this.exporter.generate(query.format ?? 'csv', columns, budget.items, {
      filename: `presupuesto-${budget.code}-v${budget.version}`,
      sheetName: 'Presupuesto',
    });
    return this.exporter.toStreamableFile(file);
  }

  @Post('budgets/:id/calculate')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Recalcular presupuesto' })
  async calculate(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(
      await this.budgets.calculateBudget(requireCompany(companyId), id),
      'Presupuesto calculado',
    );
  }

  @Post('budgets/:id/approve')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_APPROVE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Aprobar y bloquear presupuesto' })
  async approve(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(
      await this.budgets.approveBudget(requireCompany(companyId), userId, id),
      'Presupuesto aprobado',
    );
  }

  @Post('budgets/:id/items')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Agregar capítulo o actividad manual' })
  async addItem(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBudgetItemDto,
  ) {
    return Ok(
      await this.budgets.addItem(requireCompany(companyId), id, dto),
      'Actividad agregada',
    );
  }

  @Post('budgets/:id/items/from-apus')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Agregar actividades desde APUs' })
  async addFromApus(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddApusToBudgetDto,
  ) {
    return Ok(
      await this.budgets.addFromApus(requireCompany(companyId), id, dto),
      'Actividades agregadas',
    );
  }

  @Patch('budgets/:id/items/:itemId')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Actualizar actividad del presupuesto' })
  async updateItem(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateBudgetItemDto,
  ) {
    return Ok(
      await this.budgets.updateItem(requireCompany(companyId), id, itemId, dto),
      'Actividad actualizada',
    );
  }

  @Delete('budgets/:id/items/:itemId')
  @RequirePermissions(Permissions.PROJECTS.BUDGET_UPDATE)
  @Audit({ entityType: 'Budget', idParam: 'id' })
  @ApiOperation({ summary: 'Eliminar actividad del presupuesto' })
  async deleteItem(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return Ok(
      await this.budgets.deleteItem(requireCompany(companyId), id, itemId),
      'Actividad eliminada',
    );
  }
}

const BUDGET_COLUMNS: ExportColumn<BudgetItemRow>[] = [
  { id: 'code', header: 'Código', width: 14, value: (row) => row.code },
  { id: 'name', header: 'Actividad', width: 44, value: (row) => row.name },
  { id: 'item_type', header: 'Tipo', width: 10, value: (row) => row.item_type },
  { id: 'unit_code', header: 'Unidad', width: 10, value: (row) => row.unit_code },
  {
    id: 'quantity',
    header: 'Cantidad',
    numFmt: '#,##0.0000',
    value: (row) => row.quantity,
  },
  {
    id: 'unit_price',
    header: 'Valor unitario',
    numFmt: '#,##0.00',
    value: (row) => row.unit_price,
  },
  {
    id: 'partial_amount',
    header: 'Valor parcial',
    numFmt: '#,##0.00',
    value: (row) => row.partial_amount,
  },
  {
    id: 'assigned_user_name',
    header: 'Responsable',
    width: 24,
    value: (row) => row.assigned_user_name,
  },
  { id: 'notes', header: 'Notas', width: 30, value: (row) => row.notes },
];

function requireCompany(companyId: string | undefined): string {
  if (!companyId) throw new BadRequestException('Falta el header x-company-id');
  return companyId;
}
