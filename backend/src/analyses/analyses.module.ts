import { Module } from '@nestjs/common';
import { AnalysesController } from './analyses.controller.js';
import { AnalysesService } from './analyses.service.js';
import { AnalysisRepository } from './repositories/analysis.repository.js';
import { ExportModule } from '../common/export/export.module.js';

@Module({
  imports: [ExportModule],
  controllers: [AnalysesController],
  providers: [AnalysesService, AnalysisRepository],
  exports: [AnalysesService],
})
export class AnalysesModule {}
