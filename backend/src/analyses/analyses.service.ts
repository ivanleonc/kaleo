import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AnalysisRepository } from './repositories/analysis.repository.js';
import { parseEnergyResult } from './validators/energy-result.validator.js';
import type { CreateAnalysisDto } from './dto/create-analysis.dto.js';
import type { AnalysisRow } from '../common/types/db-rows.js';
import type { SortSpec } from '../common/dto/pagination-query.dto.js';
import type {
  AnalysisType,
  EnergyAnalysisResult,
  EnergyAnalysisSummary,
} from './types/analysis.types.js';

@Injectable()
export class AnalysesService {
  constructor(private readonly analysisRepository: AnalysisRepository) {}

  async getAnalyses(
    companyId: string,
    page = 1,
    limit = 20,
    filters: { search?: string; analysis_type?: AnalysisType } = {},
    sort: SortSpec = {},
  ) {
    const result = await this.analysisRepository.findPagedByCompany(
      companyId,
      page,
      limit,
      filters,
      sort,
    );
    return { ...result, data: result.data.map((item) => this.toSummary(item)) };
  }

  async getAnalysisById(companyId: string, analysisId: string) {
    const analysis = await this.analysisRepository.findById(analysisId, companyId);
    if (!analysis) throw new NotFoundException('Análisis no encontrado');
    return analysis;
  }

  async createAnalysis(companyId: string, userId: string, dto: CreateAnalysisDto) {
    const parsed = this.parseResult(dto.analysis_type, dto.result);

    if (!dto.file_name) {
      throw new BadRequestException('El nombre del archivo es requerido');
    }
    if (dto.file_size === undefined || dto.file_size === null) {
      throw new BadRequestException('El tamaño del archivo es requerido');
    }

    const analysis = await this.analysisRepository.create(companyId, userId, {
      name: dto.name,
      analysis_type: dto.analysis_type,
      source: parsed.result.meta.source,
      file_name: dto.file_name,
      file_size: dto.file_size,
      summary: parsed.summary,
      result: parsed.result,
    });

    return this.toSummary(analysis);
  }

  async renameAnalysis(companyId: string, analysisId: string, name: string) {
    const analysis = await this.analysisRepository.rename(analysisId, companyId, name);
    if (!analysis) throw new NotFoundException('Análisis no encontrado');
    return this.toSummary(analysis);
  }

  async deleteAnalysis(companyId: string, analysisId: string) {
    const deleted = await this.analysisRepository.softDelete(analysisId, companyId);
    if (!deleted) throw new NotFoundException('Análisis no encontrado');
    return { message: 'Análisis eliminado correctamente' };
  }

  private parseResult(
    analysisType: AnalysisType,
    result: Record<string, unknown>,
  ): { result: EnergyAnalysisResult; summary: EnergyAnalysisSummary } {
    switch (analysisType) {
      case 'energy': {
        const parsed = parseEnergyResult(result);
        return {
          result: parsed,
          summary: {
            periodFrom: parsed.meta.periodFrom,
            periodTo: parsed.meta.periodTo,
            rowsProcessed: parsed.meta.rowsProcessed,
            kpis: parsed.kpis,
          },
        };
      }
      default:
        throw new BadRequestException('Tipo de análisis no soportado');
    }
  }

  private toSummary(analysis: AnalysisRow) {
    return {
      id: analysis.id,
      company_id: analysis.company_id,
      created_by: analysis.created_by,
      created_by_name: analysis.created_by_name,
      name: analysis.name,
      analysis_type: analysis.analysis_type,
      source: analysis.source,
      file_name: analysis.file_name,
      file_size: analysis.file_size,
      summary: analysis.summary,
      created_at: analysis.created_at,
      updated_at: analysis.updated_at,
    };
  }
}
