import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AnalysesService } from './analyses.service.js';
import { CreateAnalysisDto } from './dto/create-analysis.dto.js';
import { UpdateAnalysisDto } from './dto/update-analysis.dto.js';
import { AnalysisQueryDto } from './dto/analysis-query.dto.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { normalizePagination, normalizeSort } from '../common/dto/pagination-query.dto.js';
import { Ok, OkPaged } from '../common/dto/api-response.dto.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';
import { Permissions } from '../common/constants/permissions.js';

@ApiTags('Analyses - Analítica')
@ApiBearerAuth()
@Controller('api/companies/analyses')
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.ANALYSES.READ)
  @ApiOperation({
    summary: 'Listar análisis de la empresa',
    description: 'Lista paginada con búsqueda, filtro por tipo y orden. No incluye el resultado completo.',
  })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiResponse({ status: 200, description: 'Lista paginada de análisis' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  async getAnalyses(
    @Headers('x-company-id') companyId: string,
    @Query() query: AnalysisQueryDto,
  ) {
    const { page, limit } = normalizePagination(query);
    const { sortBy, sortDir } = normalizeSort(query);
    const result = await this.analysesService.getAnalyses(
      companyId,
      page,
      limit,
      { search: query.search, analysis_type: query.analysis_type },
      { sortBy, sortDir },
    );
    return OkPaged(result.data, result.total, result.page, result.limit);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.ANALYSES.CREATE)
  @Audit({
    entityType: 'Analysis',
    resolveCreatedId: (response) => response?.data?.id,
    skipDiff: true,
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un análisis',
    description: 'Guarda el resultado procesado de un análisis. Requiere permiso analyses:create.',
  })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiResponse({ status: 201, description: 'Análisis creado' })
  @ApiResponse({ status: 400, description: 'Datos o resultado inválidos' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  async createAnalysis(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string,
    @Body() dto: CreateAnalysisDto,
  ) {
    const analysis = await this.analysesService.createAnalysis(companyId, userId, dto);
    return Ok(analysis, 'Análisis creado exitosamente');
  }

  @Get(':analysisId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.ANALYSES.READ)
  @ApiOperation({ summary: 'Obtener un análisis con su resultado completo' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiParam({ name: 'analysisId', description: 'UUID del análisis' })
  @ApiResponse({ status: 200, description: 'Análisis encontrado' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  @ApiResponse({ status: 404, description: 'Análisis no encontrado' })
  async getAnalysis(
    @Headers('x-company-id') companyId: string,
    @Param('analysisId', ParseUUIDPipe) analysisId: string,
  ) {
    const analysis = await this.analysesService.getAnalysisById(companyId, analysisId);
    return Ok(analysis);
  }

  @Patch(':analysisId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.ANALYSES.UPDATE)
  @Audit({ entityType: 'Analysis', idParam: 'analysisId', skipDiff: true })
  @ApiOperation({ summary: 'Renombrar un análisis' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiParam({ name: 'analysisId', description: 'UUID del análisis' })
  @ApiResponse({ status: 200, description: 'Análisis actualizado' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  @ApiResponse({ status: 404, description: 'Análisis no encontrado' })
  async renameAnalysis(
    @Headers('x-company-id') companyId: string,
    @Param('analysisId', ParseUUIDPipe) analysisId: string,
    @Body() dto: UpdateAnalysisDto,
  ) {
    const analysis = await this.analysesService.renameAnalysis(companyId, analysisId, dto.name);
    return Ok(analysis, 'Análisis actualizado exitosamente');
  }

  @Delete(':analysisId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.ANALYSES.DELETE)
  @Audit({ entityType: 'Analysis', idParam: 'analysisId', skipDiff: true })
  @ApiOperation({ summary: 'Eliminar un análisis' })
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiParam({ name: 'analysisId', description: 'UUID del análisis' })
  @ApiResponse({ status: 200, description: 'Análisis eliminado' })
  @ApiResponse({ status: 403, description: 'Permiso denegado' })
  @ApiResponse({ status: 404, description: 'Análisis no encontrado' })
  async deleteAnalysis(
    @Headers('x-company-id') companyId: string,
    @Param('analysisId', ParseUUIDPipe) analysisId: string,
  ) {
    const result = await this.analysesService.deleteAnalysis(companyId, analysisId);
    return Ok(undefined, result.message);
  }
}
