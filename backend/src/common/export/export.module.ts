import { Module } from '@nestjs/common';
import { TabularExportService } from './tabular-export.service.js';

@Module({
  providers: [TabularExportService],
  exports: [TabularExportService],
})
export class ExportModule {}
