import { Injectable, Logger } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository.js';
import { TabularExportService } from '../common/export/tabular-export.service.js';
import type { ExportFile, ExportFormat } from '../common/export/export.types.js';
import { AUDIT_EXPORT_COLUMNS, type AuditExportRow } from './audit-export.columns.js';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    private auditLogRepository: AuditLogRepository,
    private readonly exportService: TabularExportService,
  ) {}

  async log(data: {
    userId?: string;
    companyId?: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
    responseStatus?: number;
    responseData?: any;
    durationMs?: number;
  }) {
    if (!data.companyId) {
      this.logger.debug(`Skipping audit log for action "${data.action}" — no companyId provided`);
      return;
    }

    try {
      await this.auditLogRepository.log({
        ...data,
        companyId: data.companyId,
      });
    } catch (error: any) {
      this.logger.error(`Failed to write audit log: ${error.message}`);
    }
  }

  async findFiltered(params: {
    companyId: string;
    entityType?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
    limit: number;
    cursor?: string;
  }) {
    return this.auditLogRepository.findFiltered(params);
  }

  async getEntityTypes(companyId: string) {
    return this.auditLogRepository.getEntityTypes(companyId);
  }

  async findByUser(userId: string, limit?: number) {
    return this.auditLogRepository.findByUser(userId, limit);
  }

  async findByCompany(companyId: string, limit?: number) {
    return this.auditLogRepository.findByCompany(companyId, limit);
  }

  async exportLogs(params: {
    companyId: string;
    entityType?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
    format: ExportFormat;
    columns?: string[];
  }): Promise<ExportFile> {
    const rows = (await this.auditLogRepository.findForExport(params)) as AuditExportRow[];
    const selected = this.exportService.resolveColumns(
      AUDIT_EXPORT_COLUMNS,
      params.columns,
    );

    return this.exportService.generate(params.format, selected, rows, {
      filename: `auditoria_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Auditoría',
    });
  }
}
