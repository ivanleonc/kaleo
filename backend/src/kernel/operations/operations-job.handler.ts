import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MemberService } from '../../members/member.service.js';
import { BranchService } from '../../branches/branches.service.js';
import { AnalysesService } from '../../analyses/analyses.service.js';
import { AuditLogService } from '../../audit/audit-log.service.js';
import type { ExportFormat } from '../../common/export/export.types.js';
import { NotificationsService } from '../../notifications/notifications.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import type { JobRow } from '../jobs/jobs.types.js';
import {
  BRANCH_IMPORT_JOB_QUEUE,
  EXPORT_JOB_QUEUE,
  OperationsService,
  REPORT_JOB_QUEUE,
} from './operations.service.js';
import type { OperationRow } from './operations.types.js';

@Injectable()
export class OperationsJobHandler implements OnModuleInit {
  private readonly logger = new Logger(OperationsJobHandler.name);

  constructor(
    private readonly jobs: JobsService,
    private readonly operations: OperationsService,
    private readonly members: MemberService,
    private readonly branches: BranchService,
    private readonly analyses: AnalysesService,
    private readonly audit: AuditLogService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.jobs.registerHandler(EXPORT_JOB_QUEUE, (job) => this.handleExport(job));
    this.jobs.registerHandler(REPORT_JOB_QUEUE, (job) => this.handleReport(job));
    this.jobs.registerHandler(BRANCH_IMPORT_JOB_QUEUE, (job) => this.handleBranchImport(job));
  }

  private async loadOperation(job: JobRow) {
    const operationId = job.payload.operationId;
    if (typeof operationId !== 'string') {
      throw new Error('Job sin operationId');
    }
    const operation = await this.operations.getForWorker(operationId);
    if (operation.company_id !== job.company_id) {
      throw new Error('La operación no pertenece a la empresa del job');
    }
    return operation;
  }

  private async handleExport(job: JobRow): Promise<void> {
    const operation = await this.loadOperation(job);
    await this.operations.markProcessing(operation.id);

    try {
      const format = (operation.format ?? 'csv') as ExportFormat;
      const filters = (job.payload.filters ?? {}) as Record<string, string | undefined>;
      const columns = (job.payload.columns ?? []) as string[];
      const sortBy = typeof job.payload.sortBy === 'string' ? job.payload.sortBy : undefined;
      const sortDir: 'asc' | 'desc' = job.payload.sortDir === 'desc' ? 'desc' : 'asc';
      const sort = { sortBy, sortDir };

      let file;
      switch (operation.resource) {
        case 'members':
          file = await this.members.exportMembers(
            operation.company_id,
            {
              search: filters.search,
              status: filters.status,
              roleId: filters.roleId,
            },
            sort,
            format,
            columns,
          );
          break;
        case 'branches':
          file = await this.branches.exportBranches(
            operation.company_id,
            { search: filters.search, status: filters.status },
            sort,
            format,
            columns,
          );
          break;
        case 'analyses':
          file = await this.analyses.exportAnalyses(
            operation.company_id,
            { search: filters.search, analysis_type: filters.analysis_type as never },
            sort,
            format,
            columns,
          );
          break;
        case 'audit':
          file = await this.audit.exportLogs({
            companyId: operation.company_id,
            entityType: filters.entityType,
            action: filters.action,
            userId: filters.userId,
            from: filters.from,
            to: filters.to,
            format,
            columns,
          });
          break;
        default:
          throw new Error(`Recurso de exportación no soportado: ${operation.resource}`);
      }

      await this.operations.markReady(operation.id, {
        filename: file.filename,
        contentType: file.contentType,
        data: file.buffer,
      });
      await this.notifyCompleted(operation, `Tu exportación ${file.filename} está lista`);
    } catch (error) {
      const message = (error as Error).message;
      await this.operations.markFailed(operation.id, message);
      this.logger.error(`Export ${operation.id} falló: ${message}`);
      await this.notifyFailed(operation, message);
      throw error;
    }
  }

  private async handleReport(job: JobRow): Promise<void> {
    const operation = await this.loadOperation(job);
    await this.operations.markProcessing(operation.id);

    try {
      if (operation.resource !== 'analyses_summary') {
        throw new Error(`Reporte no soportado: ${operation.resource}`);
      }
      const format = (operation.format ?? 'csv') as ExportFormat;
      const file = await this.analyses.exportAnalyses(
        operation.company_id,
        {},
        { sortBy: 'created_at', sortDir: 'desc' },
        format,
      );
      await this.operations.markReady(operation.id, {
        filename: file.filename,
        contentType: file.contentType,
        data: file.buffer,
      });
      await this.notifyCompleted(operation, `Tu reporte ${file.filename} está listo`);
    } catch (error) {
      const message = (error as Error).message;
      await this.operations.markFailed(operation.id, message);
      this.logger.error(`Reporte ${operation.id} falló: ${message}`);
      await this.notifyFailed(operation, message);
      throw error;
    }
  }

  private async handleBranchImport(job: JobRow): Promise<void> {
    const operation = await this.loadOperation(job);
    await this.operations.markProcessing(operation.id);

    const rows = Array.isArray(job.payload.rows) ? job.payload.rows : [];
    let created = 0;
    const errors: Array<{ index: number; message: string }> = [];

    for (const [index, raw] of rows.entries()) {
      try {
        const row = raw as Record<string, unknown>;
        if (typeof row.name !== 'string' || !row.name.trim()) {
          throw new Error('name es requerido');
        }
        await this.branches.createBranch(operation.company_id, {
          name: row.name.trim(),
          address: stringOrUndefined(row.address),
          city: stringOrUndefined(row.city),
          state: stringOrUndefined(row.state),
          country: stringOrUndefined(row.country),
          postal_code: stringOrUndefined(row.postal_code),
          phone: stringOrUndefined(row.phone),
          email: stringOrUndefined(row.email),
          code: stringOrUndefined(row.code),
          manager_user_id: stringOrUndefined(row.manager_user_id),
          timezone: stringOrUndefined(row.timezone),
        });
        created++;
      } catch (error) {
        errors.push({ index, message: (error as Error).message });
      }
    }

    await this.operations.markReady(operation.id, {
      summary: { created, failed: errors.length, errors: errors.slice(0, 50) },
    });

    await this.notifyCompleted(
      operation,
      errors.length === 0
        ? `Se importaron ${created} sedes`
        : `Se importaron ${created} sedes; ${errors.length} filas fallaron`,
    );
  }

  private async notifyCompleted(operation: OperationRow, body: string): Promise<void> {
    await this.safeNotify({
      companyId: operation.company_id,
      userId: operation.user_id,
      type: 'operation.completed',
      category: 'operations',
      title: 'Operación completada',
      body,
      link: '/operations',
      data: {
        operationId: operation.id,
        kind: operation.kind,
        resource: operation.resource,
      },
    });
  }

  private async notifyFailed(operation: OperationRow, error: string): Promise<void> {
    await this.safeNotify({
      companyId: operation.company_id,
      userId: operation.user_id,
      type: 'operation.failed',
      category: 'operations',
      title: 'Operación fallida',
      body: error.slice(0, 500),
      link: '/operations',
      data: {
        operationId: operation.id,
        kind: operation.kind,
        resource: operation.resource,
      },
    });
  }

  private async safeNotify(
    input: Parameters<NotificationsService['notify']>[0],
  ): Promise<void> {
    try {
      await this.notifications.notify(input);
    } catch (error) {
      this.logger.warn(
        `No se pudo crear la notificación de la operación: ${(error as Error).message}`,
      );
    }
  }
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
